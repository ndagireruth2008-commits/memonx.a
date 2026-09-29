import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { PositionResult, Candidate } from '../types';
import {
  Crown,
  Medal,
  Award,
  Sparkles,
  Rotate3d,
  Eye,
  Volume2,
  VolumeX,
  TrendingUp,
  Flame,
  Camera,
  ChevronLeft,
  ChevronRight,
  Maximize2
} from 'lucide-react';
import confetti from 'canvas-confetti';

// Import generated domain images
import AUDITORIUM_BG from '../assets/images/grand_election_auditorium_1790355626297.jpg';
import GOLD_TROPHY_IMG from '../assets/images/gold_winner_trophy_3d_1790355637230.jpg';
import SILVER_MEDAL_IMG from '../assets/images/runner_up_silver_medal_1790355648027.jpg';
import FEMALE_PREFECT_IMG from '../assets/images/student_prefect_portrait_female_1790355660462.jpg';
import MALE_PREFECT_IMG from '../assets/images/student_prefect_portrait_male_1790355671730.jpg';

interface Podium3DStageProps {
  positionResult: PositionResult;
  soundEnabled?: boolean;
  onNextPosition?: () => void;
  onPrevPosition?: () => void;
  hasMultiplePositions?: boolean;
  positionIndex?: number;
  totalPositions?: number;
}

export const Podium3DStage: React.FC<Podium3DStageProps> = ({
  positionResult,
  soundEnabled = true,
  onNextPosition,
  onPrevPosition,
  hasMultiplePositions = false,
  positionIndex = 0,
  totalPositions = 1
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [autoRotate, setAutoRotate] = useState(true);
  const [cameraView, setCameraView] = useState<'front' | 'winner' | 'top'>('front');
  const [isWebGlAvailable, setIsWebGlAvailable] = useState(true);
  const [selectedCandidateIndex, setSelectedCandidateIndex] = useState<number | null>(0);

  const candidates = positionResult?.candidates || [];
  const winner = candidates[0];
  const runnerUp1 = candidates[1];
  const runnerUp2 = candidates[2];
  const otherCandidates = candidates.slice(3);
  const totalVotes = positionResult?.totalVotes || 0;

  // Helper to get fallback avatar image
  const getCandidatePhoto = (cand?: Candidate, index: number = 0) => {
    if (cand?.photoUrl && cand.photoUrl.trim().length > 10) return cand.photoUrl;
    return index % 2 === 0 ? FEMALE_PREFECT_IMG : MALE_PREFECT_IMG;
  };

  // Helper to synthesize victory fanfare
  const playFanfare = () => {
    if (!soundEnabled) return;
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const freqs = [523.25, 659.25, 783.99, 1046.50, 1318.51];
      freqs.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, ctx.currentTime + idx * 0.1);
        gain.gain.setValueAtTime(0.001, ctx.currentTime + idx * 0.1);
        gain.gain.exponentialRampToValueAtTime(0.3, ctx.currentTime + idx * 0.1 + 0.05);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + idx * 0.1 + 0.8);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(ctx.currentTime + idx * 0.1);
        osc.stop(ctx.currentTime + idx * 0.1 + 0.85);
      });
    } catch (e) {
      // Graceful silence
    }
  };

  const triggerCelebration = () => {
    playFanfare();
    confetti({
      particleCount: 150,
      spread: 100,
      origin: { y: 0.6 },
      colors: ['#F59E0B', '#FDE047', '#E2E8F0', '#38BDF8', '#10B981']
    });
  };

  // Three.js WebGL Scene Lifecycle
  useEffect(() => {
    if (!containerRef.current) return;
    const container = containerRef.current;
    const width = container.clientWidth || 800;
    const height = container.clientHeight || 600;

    // Check WebGL support
    try {
      const testCanvas = document.createElement('canvas');
      const gl = testCanvas.getContext('webgl') || testCanvas.getContext('experimental-webgl');
      if (!gl) {
        setIsWebGlAvailable(false);
        return;
      }
    } catch {
      setIsWebGlAvailable(false);
      return;
    }

    // 1. Scene & Camera Setup
    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x060b19, 0.035);

    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
    camera.position.set(0, 4.5, 13.5);
    camera.lookAt(0, 1.8, 0);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.25;

    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    // 2. Lighting System
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.9);
    scene.add(ambientLight);

    // Warm Gold Key Spotlight on Winner
    const keySpotlight = new THREE.SpotLight(0xffe066, 4.5, 30, Math.PI / 4, 0.4, 1);
    keySpotlight.position.set(0, 12, 6);
    keySpotlight.castShadow = true;
    keySpotlight.shadow.mapSize.width = 1024;
    keySpotlight.shadow.mapSize.height = 1024;
    scene.add(keySpotlight);

    // Cool Blue Rim Light from rear
    const rimLight = new THREE.DirectionalLight(0x60a5fa, 2.0);
    rimLight.position.set(-6, 8, -6);
    scene.add(rimLight);

    // Front soft fill
    const fillLight = new THREE.DirectionalLight(0xfff1f2, 1.5);
    fillLight.position.set(6, 6, 8);
    scene.add(fillLight);

    // 3. Stage & Grand Ground Disc
    const stageGroup = new THREE.Group();
    scene.add(stageGroup);

    // Main Stage Disc
    const stageGeo = new THREE.CylinderGeometry(8.2, 8.8, 0.6, 64);
    const stageMat = new THREE.MeshStandardMaterial({
      color: 0x090f20,
      metalness: 0.85,
      roughness: 0.25
    });
    const stageMesh = new THREE.Mesh(stageGeo, stageMat);
    stageMesh.position.y = -0.3;
    stageMesh.receiveShadow = true;
    stageGroup.add(stageMesh);

    // Glowing Neon Stage Rim
    const rimTorusGeo = new THREE.TorusGeometry(8.3, 0.08, 16, 100);
    const rimTorusMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8 });
    const rimTorusMesh = new THREE.Mesh(rimTorusGeo, rimTorusMat);
    rimTorusMesh.rotation.x = Math.PI / 2;
    rimTorusMesh.position.y = 0.01;
    stageGroup.add(rimTorusMesh);

    // Inner Gold Stage Halo Ring
    const innerRingGeo = new THREE.TorusGeometry(4.8, 0.06, 16, 80);
    const innerRingMat = new THREE.MeshBasicMaterial({ color: 0xf59e0b });
    const innerRingMesh = new THREE.Mesh(innerRingGeo, innerRingMat);
    innerRingMesh.rotation.x = Math.PI / 2;
    innerRingMesh.position.y = 0.02;
    stageGroup.add(innerRingMesh);

    // Helper to generate a text texture for candidate tokens
    const createCandidateTexture = (name: string, votesCount: number, rankStr: string, colorHex: string) => {
      const canvas = document.createElement('canvas');
      canvas.width = 512;
      canvas.height = 512;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        // Background gradient
        const grad = ctx.createRadialGradient(256, 256, 40, 256, 256, 256);
        grad.addColorStop(0, '#1e293b');
        grad.addColorStop(1, '#020617');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, 512, 512);

        // Border ring
        ctx.lineWidth = 16;
        ctx.strokeStyle = colorHex;
        ctx.beginPath();
        ctx.arc(256, 256, 240, 0, Math.PI * 2);
        ctx.stroke();

        // Rank Badge
        ctx.fillStyle = colorHex;
        ctx.font = 'bold 38px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(rankStr, 256, 120);

        // Candidate Name
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 36px sans-serif';
        const display = name.length > 18 ? name.slice(0, 16) + '...' : name;
        ctx.fillText(display, 256, 260);

        // Votes
        ctx.fillStyle = colorHex;
        ctx.font = 'bold 48px sans-serif';
        ctx.fillText(`${votesCount} VOTES`, 256, 360);

        // Verification stamp
        ctx.fillStyle = '#94a3b8';
        ctx.font = '22px sans-serif';
        ctx.fillText('OFFICIAL BALLOT RECORD', 256, 420);
      }
      return new THREE.CanvasTexture(canvas);
    };

    // 4. Podium Pedestals Construction
    // --- 1st Place (Center Gold) ---
    const p1Height = 3.6;
    const p1Radius = 1.9;
    const p1Geo = new THREE.CylinderGeometry(p1Radius, p1Radius + 0.25, p1Height, 48);
    const p1Mat = new THREE.MeshStandardMaterial({
      color: 0xf59e0b,
      metalness: 0.95,
      roughness: 0.18,
      emissive: 0x78350f,
      emissiveIntensity: 0.2
    });
    const p1Mesh = new THREE.Mesh(p1Geo, p1Mat);
    p1Mesh.position.set(0, p1Height / 2, 0);
    p1Mesh.castShadow = true;
    p1Mesh.receiveShadow = true;
    stageGroup.add(p1Mesh);

    // 1st Place Top Ring Light
    const p1Ring = new THREE.Mesh(
      new THREE.TorusGeometry(p1Radius + 0.05, 0.07, 16, 48),
      new THREE.MeshBasicMaterial({ color: 0xfef08a })
    );
    p1Ring.rotation.x = Math.PI / 2;
    p1Ring.position.set(0, p1Height, 0);
    stageGroup.add(p1Ring);

    // 3D Trophy Model on Center Stage
    const trophyGroup = new THREE.Group();
    // Trophy Base (Black marble cylinder)
    const tBaseGeo = new THREE.CylinderGeometry(0.7, 0.85, 0.5, 32);
    const tBaseMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.2, metalness: 0.9 });
    const tBase = new THREE.Mesh(tBaseGeo, tBaseMat);
    tBase.position.y = 0.25;
    trophyGroup.add(tBase);

    // Trophy Stem
    const tStemGeo = new THREE.CylinderGeometry(0.2, 0.35, 0.7, 24);
    const tGoldMat = new THREE.MeshStandardMaterial({
      color: 0xffd700,
      metalness: 0.98,
      roughness: 0.12,
      emissive: 0x92400e,
      emissiveIntensity: 0.25
    });
    const tStem = new THREE.Mesh(tStemGeo, tGoldMat);
    tStem.position.y = 0.85;
    trophyGroup.add(tStem);

    // Trophy Cup Bowl
    const tCupGeo = new THREE.CylinderGeometry(1.0, 0.45, 1.2, 32, 1, true);
    const tCup = new THREE.Mesh(tCupGeo, tGoldMat);
    tCup.position.y = 1.7;
    trophyGroup.add(tCup);

    const tCupBaseGeo = new THREE.CylinderGeometry(0.45, 0.45, 0.1, 32);
    const tCupBase = new THREE.Mesh(tCupBaseGeo, tGoldMat);
    tCupBase.position.y = 1.15;
    trophyGroup.add(tCupBase);

    // Trophy Handles (Two Torus arches)
    const handleGeo = new THREE.TorusGeometry(0.55, 0.07, 16, 32, Math.PI);
    const leftHandle = new THREE.Mesh(handleGeo, tGoldMat);
    leftHandle.rotation.z = -Math.PI / 2;
    leftHandle.position.set(-0.95, 1.7, 0);
    trophyGroup.add(leftHandle);

    const rightHandle = new THREE.Mesh(handleGeo, tGoldMat);
    rightHandle.rotation.z = Math.PI / 2;
    rightHandle.position.set(0.95, 1.7, 0);
    trophyGroup.add(rightHandle);

    // Trophy Crown / Star Finial
    const starGeo = new THREE.OctahedronGeometry(0.35, 0);
    const starMesh = new THREE.Mesh(starGeo, tGoldMat);
    starMesh.position.y = 2.45;
    trophyGroup.add(starMesh);

    trophyGroup.position.set(0, p1Height, 0);
    stageGroup.add(trophyGroup);

    // 1st Place Candidate 3D Picture Token (Facing front)
    if (winner) {
      const tokenTexture = createCandidateTexture(winner.fullName, winner.votes, '★ 1ST PLACE WINNER ★', '#F59E0B');
      const tokenGeo = new THREE.CylinderGeometry(1.0, 1.0, 0.12, 32);
      const tokenMat = [
        new THREE.MeshStandardMaterial({ color: 0xf59e0b, metalness: 0.9, roughness: 0.2 }),
        new THREE.MeshStandardMaterial({ map: tokenTexture }),
        new THREE.MeshStandardMaterial({ color: 0x020617 })
      ];
      const tokenMesh = new THREE.Mesh(tokenGeo, tokenMat);
      tokenMesh.rotation.x = Math.PI / 2 - 0.15;
      tokenMesh.position.set(0, p1Height + 0.35, 1.45);
      stageGroup.add(tokenMesh);
    }

    // --- 2nd Place (Left Silver) ---
    const p2Height = 2.2;
    const p2Radius = 1.6;
    const p2Geo = new THREE.CylinderGeometry(p2Radius, p2Radius + 0.2, p2Height, 40);
    const p2Mat = new THREE.MeshStandardMaterial({
      color: 0x94a3b8,
      metalness: 0.9,
      roughness: 0.22,
      emissive: 0x1e293b,
      emissiveIntensity: 0.15
    });
    const p2Mesh = new THREE.Mesh(p2Geo, p2Mat);
    p2Mesh.position.set(-4.2, p2Height / 2, 0.3);
    p2Mesh.castShadow = true;
    p2Mesh.receiveShadow = true;
    stageGroup.add(p2Mesh);

    // 2nd Place Silver Medal Model
    const silverMedalGroup = new THREE.Group();
    const sDiscGeo = new THREE.CylinderGeometry(0.8, 0.8, 0.12, 32);
    const silverMat = new THREE.MeshStandardMaterial({
      color: 0xe2e8f0,
      metalness: 0.92,
      roughness: 0.18,
      emissive: 0x334155,
      emissiveIntensity: 0.2
    });
    const sDisc = new THREE.Mesh(sDiscGeo, silverMat);
    sDisc.rotation.x = Math.PI / 2;
    silverMedalGroup.add(sDisc);

    // Silver Laurel Ring
    const sRingGeo = new THREE.TorusGeometry(0.65, 0.06, 16, 32);
    const sRing = new THREE.Mesh(sRingGeo, silverMat);
    silverMedalGroup.add(sRing);

    silverMedalGroup.position.set(-4.2, p2Height + 1.2, 0.3);
    stageGroup.add(silverMedalGroup);

    // 2nd Place Candidate Token
    if (runnerUp1) {
      const sTokenTexture = createCandidateTexture(runnerUp1.fullName, runnerUp1.votes, '2ND PLACE • RUNNER-UP', '#CBD5E1');
      const sTokenGeo = new THREE.CylinderGeometry(0.85, 0.85, 0.1, 32);
      const sTokenMat = [
        new THREE.MeshStandardMaterial({ color: 0x94a3b8, metalness: 0.9, roughness: 0.2 }),
        new THREE.MeshStandardMaterial({ map: sTokenTexture }),
        new THREE.MeshStandardMaterial({ color: 0x020617 })
      ];
      const sTokenMesh = new THREE.Mesh(sTokenGeo, sTokenMat);
      sTokenMesh.rotation.x = Math.PI / 2 - 0.15;
      sTokenMesh.position.set(-4.2, p2Height + 0.3, 1.3);
      stageGroup.add(sTokenMesh);
    }

    // --- 3rd Place (Right Bronze) ---
    const p3Height = 1.4;
    const p3Radius = 1.45;
    const p3Geo = new THREE.CylinderGeometry(p3Radius, p3Radius + 0.2, p3Height, 40);
    const p3Mat = new THREE.MeshStandardMaterial({
      color: 0xcd7f32,
      metalness: 0.85,
      roughness: 0.28,
      emissive: 0x451a03,
      emissiveIntensity: 0.15
    });
    const p3Mesh = new THREE.Mesh(p3Geo, p3Mat);
    p3Mesh.position.set(4.2, p3Height / 2, 0.3);
    p3Mesh.castShadow = true;
    p3Mesh.receiveShadow = true;
    stageGroup.add(p3Mesh);

    // 3rd Place Bronze Shield Model
    const bronzeGroup = new THREE.Group();
    const bDiscGeo = new THREE.CylinderGeometry(0.7, 0.7, 0.1, 32);
    const bronzeMat = new THREE.MeshStandardMaterial({
      color: 0xd97706,
      metalness: 0.85,
      roughness: 0.25,
      emissive: 0x78350f,
      emissiveIntensity: 0.2
    });
    const bDisc = new THREE.Mesh(bDiscGeo, bronzeMat);
    bDisc.rotation.x = Math.PI / 2;
    bronzeGroup.add(bDisc);

    bronzeGroup.position.set(4.2, p3Height + 1.0, 0.3);
    stageGroup.add(bronzeGroup);

    // 3rd Place Candidate Token
    if (runnerUp2) {
      const bTokenTexture = createCandidateTexture(runnerUp2.fullName, runnerUp2.votes, '3RD PLACE • CONTENDER', '#D97706');
      const bTokenGeo = new THREE.CylinderGeometry(0.8, 0.8, 0.1, 32);
      const bTokenMat = [
        new THREE.MeshStandardMaterial({ color: 0xcd7f32, metalness: 0.85, roughness: 0.28 }),
        new THREE.MeshStandardMaterial({ map: bTokenTexture }),
        new THREE.MeshStandardMaterial({ color: 0x020617 })
      ];
      const bTokenMesh = new THREE.Mesh(bTokenGeo, bTokenMat);
      bTokenMesh.rotation.x = Math.PI / 2 - 0.15;
      bTokenMesh.position.set(4.2, p3Height + 0.3, 1.2);
      stageGroup.add(bTokenMesh);
    }

    // 5. Celebration Sparkling Particle Dust
    const particleCount = 450;
    const particleGeo = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);
    const colors = new Float32Array(particleCount * 3);

    const cGold = new THREE.Color(0xf59e0b);
    const cAmber = new THREE.Color(0xfef08a);
    const cCyan = new THREE.Color(0x38bdf8);

    for (let i = 0; i < particleCount; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 16;
      positions[i * 3 + 1] = Math.random() * 9;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 14;

      const pick = Math.random();
      const col = pick > 0.6 ? cGold : pick > 0.3 ? cAmber : cCyan;
      colors[i * 3] = col.r;
      colors[i * 3 + 1] = col.g;
      colors[i * 3 + 2] = col.b;
    }
    particleGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    particleGeo.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const particleMat = new THREE.PointsMaterial({
      size: 0.1,
      vertexColors: true,
      transparent: true,
      opacity: 0.85,
      blending: THREE.AdditiveBlending
    });
    const particleSystem = new THREE.Points(particleGeo, particleMat);
    scene.add(particleSystem);

    // 6. Interactive Mouse Drag & Touch Orbit Controls
    let isDragging = false;
    let prevMouseX = 0;
    let prevMouseY = 0;
    let targetRotationY = 0;
    let targetRotationX = 0.08;

    const onMouseDown = (e: MouseEvent) => {
      isDragging = true;
      prevMouseX = e.clientX;
      prevMouseY = e.clientY;
    };

    const onMouseMove = (e: MouseEvent) => {
      if (!isDragging) return;
      const deltaX = e.clientX - prevMouseX;
      const deltaY = e.clientY - prevMouseY;
      prevMouseX = e.clientX;
      prevMouseY = e.clientY;

      targetRotationY += deltaX * 0.006;
      targetRotationX = Math.max(-0.2, Math.min(0.45, targetRotationX + deltaY * 0.004));
    };

    const onMouseUp = () => {
      isDragging = false;
    };

    const onTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 1) {
        isDragging = true;
        prevMouseX = e.touches[0].clientX;
        prevMouseY = e.touches[0].clientY;
      }
    };

    const onTouchMove = (e: TouchEvent) => {
      if (!isDragging || e.touches.length !== 1) return;
      const deltaX = e.touches[0].clientX - prevMouseX;
      const deltaY = e.touches[0].clientY - prevMouseY;
      prevMouseX = e.touches[0].clientX;
      prevMouseY = e.touches[0].clientY;

      targetRotationY += deltaX * 0.007;
      targetRotationX = Math.max(-0.2, Math.min(0.45, targetRotationX + deltaY * 0.005));
    };

    const onTouchEnd = () => {
      isDragging = false;
    };

    container.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    container.addEventListener('touchstart', onTouchStart);
    window.addEventListener('touchmove', onTouchMove);
    window.addEventListener('touchend', onTouchEnd);

    // Resize Handler
    const handleResize = () => {
      if (!containerRef.current) return;
      const newW = containerRef.current.clientWidth;
      const newH = containerRef.current.clientHeight;
      camera.aspect = newW / newH;
      camera.updateProjectionMatrix();
      renderer.setSize(newW, newH);
    };
    window.addEventListener('resize', handleResize);

    // 7. Render Loop
    let animationFrameId: number;
    let clock = new THREE.Clock();

    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);
      const elapsedTime = clock.getElapsedTime();

      // Auto rotation when enabled and not dragging
      if (autoRotate && !isDragging) {
        targetRotationY += 0.003;
      }

      // Smooth lerp stage rotation
      stageGroup.rotation.y += (targetRotationY - stageGroup.rotation.y) * 0.08;
      stageGroup.rotation.x += (targetRotationX - stageGroup.rotation.x) * 0.08;

      // Rotate individual trophies and medals on their plinths
      trophyGroup.rotation.y = elapsedTime * 0.8;
      trophyGroup.position.y = p1Height + Math.sin(elapsedTime * 2) * 0.08;

      silverMedalGroup.rotation.y = elapsedTime * 0.7;
      silverMedalGroup.position.y = p2Height + 1.2 + Math.sin(elapsedTime * 1.8 + 1) * 0.06;

      bronzeGroup.rotation.y = elapsedTime * 0.6;
      bronzeGroup.position.y = p3Height + 1.0 + Math.sin(elapsedTime * 1.6 + 2) * 0.05;

      // Animate Particles upward
      const posAttr = particleGeo.attributes.position as THREE.BufferAttribute;
      for (let i = 0; i < particleCount; i++) {
        let py = posAttr.getY(i);
        py += 0.02 + (i % 3) * 0.008;
        if (py > 9) py = 0.2;
        posAttr.setY(i, py);
      }
      posAttr.needsUpdate = true;

      // Camera preset positioning with smooth interpolation
      let targetCamX = 0;
      let targetCamY = 4.5;
      let targetCamZ = 13.5;

      if (cameraView === 'winner') {
        targetCamX = 0;
        targetCamY = 4.8;
        targetCamZ = 8.5;
      } else if (cameraView === 'top') {
        targetCamX = 0;
        targetCamY = 9.5;
        targetCamZ = 12.0;
      }

      camera.position.x += (targetCamX - camera.position.x) * 0.05;
      camera.position.y += (targetCamY - camera.position.y) * 0.05;
      camera.position.z += (targetCamZ - camera.position.z) * 0.05;
      camera.lookAt(0, 1.8, 0);

      renderer.render(scene, camera);
    };

    animate();

    // Trigger opening fanfare
    triggerCelebration();

    // Cleanup
    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', handleResize);
      container.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      container.removeEventListener('touchstart', onTouchStart);
      window.removeEventListener('touchmove', onTouchMove);
      window.removeEventListener('touchend', onTouchEnd);
      renderer.dispose();
    };
  }, [positionResult?.position?.id, autoRotate, cameraView]);

  return (
    <div className="relative w-full h-full min-h-[640px] flex flex-col justify-between overflow-hidden bg-slate-950 text-white select-none">
      {/* 1. Dramatic Auditorium Photographic Backdrop Scrim */}
      <div className="absolute inset-0 pointer-events-none opacity-25 mix-blend-screen overflow-hidden">
        <img
          src={AUDITORIUM_BG}
          alt="Ceremonial Auditorium"
          className="w-full h-full object-cover object-center filter blur-[1px] scale-105"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/60 to-transparent" />
      </div>

      {/* 2. Three.js 3D WebGL Canvas Viewport */}
      <div
        ref={containerRef}
        className="absolute inset-0 w-full h-full cursor-grab active:cursor-grabbing z-0"
        title="Click & Drag to rotate the 3D Olympic Podium stage in 360°"
      />

      {/* 3. Top Ceremonial Projection Header Overlay */}
      <header className="relative z-10 p-6 flex flex-col md:flex-row items-center justify-between gap-4 bg-gradient-to-b from-slate-950/90 via-slate-950/40 to-transparent backdrop-blur-[2px]">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center shadow-lg shadow-amber-500/10">
            <Crown className="w-6 h-6 text-amber-400 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2 text-xs text-amber-400 font-semibold tracking-wider uppercase">
              <span>Official 3D Projections</span>
              <span aria-hidden="true">·</span>
              <span>Position {positionIndex + 1} of {totalPositions}</span>
              <span aria-hidden="true">·</span>
              <span className="text-emerald-400 font-mono">{totalVotes} Ballots Cast</span>
            </div>
            <h2 className="text-2xl md:text-3xl font-bold tracking-tight text-white flex items-center gap-2">
              {positionResult?.position?.title || 'Prefect Position'}
            </h2>
          </div>
        </div>

        {/* 3D Stage Controls & Navigation */}
        <div className="flex items-center gap-2 bg-slate-900/80 p-1.5 rounded-xl border border-slate-800 shadow-xl backdrop-blur-md">
          {hasMultiplePositions && onPrevPosition && (
            <button
              onClick={onPrevPosition}
              className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              title="Previous Position"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
          )}

          {/* Camera View Switcher */}
          <div className="flex items-center bg-slate-950 rounded-lg p-0.5 border border-slate-800 text-xs">
            <button
              onClick={() => setCameraView('front')}
              className={`px-3 py-1.5 rounded-md font-medium transition-colors ${
                cameraView === 'front' ? 'bg-amber-500 text-slate-950 font-bold shadow' : 'text-slate-400 hover:text-white'
              }`}
            >
              Stage View
            </button>
            <button
              onClick={() => setCameraView('winner')}
              className={`px-3 py-1.5 rounded-md font-medium transition-colors ${
                cameraView === 'winner' ? 'bg-amber-500 text-slate-950 font-bold shadow' : 'text-slate-400 hover:text-white'
              }`}
            >
              Winner Close-up
            </button>
            <button
              onClick={() => setCameraView('top')}
              className={`px-3 py-1.5 rounded-md font-medium transition-colors ${
                cameraView === 'top' ? 'bg-amber-500 text-slate-950 font-bold shadow' : 'text-slate-400 hover:text-white'
              }`}
            >
              High Angle
            </button>
          </div>

          {/* Auto Rotate Toggle */}
          <button
            onClick={() => setAutoRotate(!autoRotate)}
            className={`p-2 rounded-lg border transition-colors ${
              autoRotate
                ? 'bg-sky-500/20 text-sky-400 border-sky-500/40'
                : 'text-slate-400 border-transparent hover:bg-slate-800 hover:text-white'
            }`}
            title={autoRotate ? 'Pause 3D Rotation' : 'Enable 3D Auto-Rotation'}
          >
            <Rotate3d className={`w-5 h-5 ${autoRotate ? 'animate-spin' : ''}`} style={{ animationDuration: '6s' }} />
          </button>

          {/* Fireworks Celebration */}
          <button
            onClick={triggerCelebration}
            className="p-2 rounded-lg bg-amber-500/20 text-amber-300 border border-amber-500/40 hover:bg-amber-500/30 transition-colors"
            title="Launch Confetti & Chimes"
          >
            <Sparkles className="w-5 h-5" />
          </button>

          {hasMultiplePositions && onNextPosition && (
            <button
              onClick={onNextPosition}
              className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              title="Next Position"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          )}
        </div>
      </header>

      {/* 4. Interactive Drag Guidance Banner */}
      <div className="relative z-10 self-center pointer-events-none mt-2">
        <span className="text-xs px-3 py-1 rounded-full bg-slate-900/60 border border-slate-700/60 text-slate-400 tracking-wide backdrop-blur-sm shadow flex items-center gap-1.5">
          <Rotate3d className="w-3.5 h-3.5 text-amber-400" />
          Interactive 3D Stage: Click & Drag to Orbit 360°
        </span>
      </div>

      {/* 5. Bottom Candidates Projections Honor Gallery Overlay */}
      <footer className="relative z-10 p-6 bg-gradient-to-t from-slate-950 via-slate-950/80 to-transparent">
        <div className="max-w-6xl mx-auto">
          {/* Main Podium Contenders Cards (1st Winner, 2nd Silver, 3rd Bronze) */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            {/* 2nd Place Silver Runner-Up Card */}
            {runnerUp1 ? (
              <div
                onClick={() => setSelectedCandidateIndex(1)}
                className={`cursor-pointer rounded-2xl p-4 border transition-all duration-300 backdrop-blur-md ${
                  selectedCandidateIndex === 1
                    ? 'bg-slate-900/95 border-slate-300 shadow-xl shadow-slate-400/10 scale-[1.02]'
                    : 'bg-slate-950/70 border-slate-800 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="relative w-14 h-14 rounded-full overflow-hidden border-2 border-slate-300 shadow shrink-0">
                    <img
                      src={getCandidatePhoto(runnerUp1, 1)}
                      alt={runnerUp1.fullName}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute top-0 right-0 w-5 h-5 rounded-full bg-slate-200 text-slate-950 font-bold text-[10px] flex items-center justify-center">
                      2
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between text-xs text-slate-400">
                      <span className="font-semibold text-slate-300">1st Runner-Up</span>
                      <span className="font-mono text-rose-400 font-medium">
                        -{winner ? Math.max(0, winner.votes - runnerUp1.votes) : 0} votes
                      </span>
                    </div>
                    <h4 className="text-base font-bold text-white truncate">{runnerUp1.fullName}</h4>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-lg font-black text-slate-200 font-mono">{runnerUp1.votes}</span>
                      <span className="text-xs text-slate-400 font-mono">({runnerUp1.percentage.toFixed(1)}%)</span>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="rounded-2xl p-4 border border-dashed border-slate-800 text-slate-600 flex items-center justify-center text-sm">
                No 1st Runner-Up
              </div>
            )}

            {/* 1st Place Gold Winner Card (Hero Center) */}
            {winner ? (
              <div
                onClick={() => setSelectedCandidateIndex(0)}
                className={`cursor-pointer rounded-2xl p-5 border-2 transition-all duration-300 backdrop-blur-md relative overflow-hidden ${
                  selectedCandidateIndex === 0
                    ? 'bg-gradient-to-b from-amber-950/80 to-slate-950/90 border-amber-400 shadow-2xl shadow-amber-500/20 scale-[1.03]'
                    : 'bg-gradient-to-b from-amber-950/40 to-slate-950/80 border-amber-500/50 hover:border-amber-400'
                }`}
              >
                <div className="absolute -top-6 -right-6 w-24 h-24 bg-amber-500/20 rounded-full blur-xl pointer-events-none" />
                <div className="flex items-center gap-4">
                  <div className="relative w-16 h-16 rounded-full overflow-hidden border-2 border-amber-400 shadow-lg shadow-amber-500/30 shrink-0 ring-4 ring-amber-500/20">
                    <img
                      src={getCandidatePhoto(winner, 0)}
                      alt={winner.fullName}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute bottom-0 inset-x-0 bg-amber-500 text-slate-950 text-[9px] font-black uppercase text-center py-0.5">
                      Winner
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-amber-400 flex items-center gap-1 uppercase tracking-wider">
                        <Crown className="w-3.5 h-3.5 fill-amber-400" /> Elected Winner
                      </span>
                      <span className="text-emerald-400 font-mono font-semibold">
                        +{runnerUp1 ? Math.max(0, winner.votes - runnerUp1.votes) : winner.votes} lead
                      </span>
                    </div>
                    <h3 className="text-lg font-black text-white truncate tracking-tight">{winner.fullName}</h3>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-2xl font-black text-amber-400 font-mono">{winner.votes}</span>
                      <span className="text-xs text-amber-200/80 font-mono">({winner.percentage.toFixed(1)}% Share)</span>
                      {winner.gradeOrClass && (
                        <span className="text-xs text-slate-400 ml-auto">{winner.gradeOrClass}</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="rounded-2xl p-4 border border-dashed border-amber-900/40 text-amber-600 flex items-center justify-center text-sm">
                No Winner Recorded
              </div>
            )}

            {/* 3rd Place Bronze Runner-Up Card */}
            {runnerUp2 ? (
              <div
                onClick={() => setSelectedCandidateIndex(2)}
                className={`cursor-pointer rounded-2xl p-4 border transition-all duration-300 backdrop-blur-md ${
                  selectedCandidateIndex === 2
                    ? 'bg-slate-900/95 border-amber-600 shadow-xl shadow-amber-700/10 scale-[1.02]'
                    : 'bg-slate-950/70 border-slate-800 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="relative w-14 h-14 rounded-full overflow-hidden border-2 border-amber-600 shadow shrink-0">
                    <img
                      src={getCandidatePhoto(runnerUp2, 2)}
                      alt={runnerUp2.fullName}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute top-0 right-0 w-5 h-5 rounded-full bg-amber-600 text-white font-bold text-[10px] flex items-center justify-center">
                      3
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between text-xs text-slate-400">
                      <span className="font-semibold text-amber-500">2nd Runner-Up</span>
                      <span className="font-mono text-rose-400 font-medium">
                        -{winner ? Math.max(0, winner.votes - runnerUp2.votes) : 0} votes
                      </span>
                    </div>
                    <h4 className="text-base font-bold text-white truncate">{runnerUp2.fullName}</h4>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-lg font-black text-amber-500 font-mono">{runnerUp2.votes}</span>
                      <span className="text-xs text-slate-400 font-mono">({runnerUp2.percentage.toFixed(1)}%)</span>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="rounded-2xl p-4 border border-dashed border-slate-800 text-slate-600 flex items-center justify-center text-sm">
                No 2nd Runner-Up
              </div>
            )}
          </div>

          {/* Other Commended Candidates (4th Place and beyond) */}
          {otherCandidates.length > 0 && (
            <div className="pt-2 border-t border-slate-800/80">
              <div className="flex items-center gap-2 text-xs text-slate-400 mb-2 font-medium">
                <span>Honorable Contenders</span>
                <span aria-hidden="true">·</span>
                <span>Democratic Candidates</span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2">
                {otherCandidates.map((cand, idx) => (
                  <div
                    key={cand.id}
                    className="flex items-center gap-2 bg-slate-900/60 border border-slate-800/80 rounded-xl p-2 text-xs backdrop-blur-sm"
                  >
                    <span className="w-5 h-5 rounded-md bg-slate-800 text-slate-400 font-mono font-bold flex items-center justify-center text-[10px] shrink-0">
                      #{idx + 4}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="font-medium text-slate-200 truncate">{cand.fullName}</div>
                      <div className="text-slate-400 font-mono text-[11px]">
                        {cand.votes} votes ({cand.percentage.toFixed(1)}%)
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </footer>
    </div>
  );
};
