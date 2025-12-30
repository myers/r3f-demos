/**
 * Load Mixamo animation, convert for three-vrm use, and return it.
 * Based on https://github.com/pixiv/three-vrm/blob/dev/packages/three-vrm/examples/humanoidAnimation/loadMixamoAnimation.js
 */
import * as THREE from 'three'
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader.js'
import type { VRM } from '@pixiv/three-vrm'
import { mixamoVRMRigMap } from './mixamoVRMRigMap'

/**
 * Load a Mixamo FBX animation and convert it for VRM use
 * @param url URL to the Mixamo FBX animation file
 * @param vrm The target VRM model
 * @returns Promise resolving to the converted AnimationClip
 */
export function loadMixamoAnimation(url: string, vrm: VRM): Promise<THREE.AnimationClip> {
  const loader = new FBXLoader()

  return loader.loadAsync(url).then((asset) => {
    // Extract the AnimationClip (Mixamo names clips 'mixamo.com')
    const clip = THREE.AnimationClip.findByName(asset.animations, 'mixamo.com') || asset.animations[0]

    if (!clip) {
      throw new Error('No animation clip found in FBX file')
    }

    const tracks: THREE.KeyframeTrack[] = []

    const restRotationInverse = new THREE.Quaternion()
    const parentRestWorldRotation = new THREE.Quaternion()
    const _quatA = new THREE.Quaternion()

    // Adjust with reference to hips height
    const hipsNode = asset.getObjectByName('mixamorigHips')
    if (!hipsNode) {
      throw new Error('Could not find mixamorigHips in FBX')
    }

    const motionHipsHeight = hipsNode.position.y
    const vrmHipsPosition = vrm.humanoid.normalizedRestPose.hips?.position
    const vrmHipsHeight = vrmHipsPosition ? vrmHipsPosition[1] : 1
    const hipsPositionScale = vrmHipsHeight / motionHipsHeight

    clip.tracks.forEach((track) => {
      // Convert each track for VRM use
      const trackSplitted = track.name.split('.')
      const mixamoRigName = trackSplitted[0]
      const vrmBoneName = mixamoVRMRigMap[mixamoRigName]

      if (!vrmBoneName) return

      const vrmNode = vrm.humanoid?.getNormalizedBoneNode(vrmBoneName as any)
      const vrmNodeName = vrmNode?.name
      const mixamoRigNode = asset.getObjectByName(mixamoRigName)

      if (vrmNodeName != null && mixamoRigNode) {
        const propertyName = trackSplitted[1]

        // Store rotations of rest-pose
        mixamoRigNode.getWorldQuaternion(restRotationInverse).invert()
        mixamoRigNode.parent?.getWorldQuaternion(parentRestWorldRotation)

        if (track instanceof THREE.QuaternionKeyframeTrack) {
          // Retarget rotation of mixamoRig to NormalizedBone
          for (let i = 0; i < track.values.length; i += 4) {
            const flatQuaternion = track.values.slice(i, i + 4)

            _quatA.fromArray(flatQuaternion)

            // Parent rest world rotation * track rotation * rest world rotation inverse
            _quatA.premultiply(parentRestWorldRotation).multiply(restRotationInverse)

            _quatA.toArray(flatQuaternion)

            flatQuaternion.forEach((v, index) => {
              track.values[index + i] = v
            })
          }

          tracks.push(
            new THREE.QuaternionKeyframeTrack(
              `${vrmNodeName}.${propertyName}`,
              track.times,
              track.values.map((v, i) => (vrm.meta?.metaVersion === '0' && i % 2 === 0 ? -v : v))
            )
          )
        } else if (track instanceof THREE.VectorKeyframeTrack) {
          const value = track.values.map(
            (v, i) => (vrm.meta?.metaVersion === '0' && i % 3 !== 1 ? -v : v) * hipsPositionScale
          )
          tracks.push(new THREE.VectorKeyframeTrack(`${vrmNodeName}.${propertyName}`, track.times, value))
        }
      }
    })

    return new THREE.AnimationClip('vrmAnimation', clip.duration, tracks)
  })
}
