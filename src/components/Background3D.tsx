"use client";

import React, { useEffect, useRef } from "react";
import * as THREE from "three";

const vertexShader = `
  uniform float uTime; uniform float uDistortion; uniform float uSize; uniform vec2 uMouse; varying float vAlpha; varying vec3 vPos; varying float vNoise;
  vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; } vec4 mod289(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; } vec4 permute(vec4 x) { return mod289(((x*34.0)+1.0)*x); } vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; } float snoise(vec3 v) { const vec2 C = vec2(1.0/6.0, 1.0/3.0) ; const vec4 D = vec4(0.0, 0.5, 1.0, 2.0); vec3 i = floor(v + dot(v, C.yyy) ); vec3 x0 = v - i + dot(i, C.xxx) ; vec3 g = step(x0.yzx, x0.xyz); vec3 l = 1.0 - g; vec3 i1 = min( g.xyz, l.zxy ); vec3 i2 = max( g.xyz, l.zxy ); vec3 x1 = x0 - i1 + 1.0 * C.xxx; vec3 x2 = x0 - i2 + 2.0 * C.xxx; vec3 x3 = x0 - 1.0 + 3.0 * C.xxx; i = mod289(i); vec4 p = permute( permute( permute( i.z + vec4(0.0, i1.z, i2.z, 1.0 )) + i.y + vec4(0.0, i1.y, i2.y, 1.0 )) + i.x + vec4(0.0, i1.x, i2.x, 1.0 )); float n_ = 1.0/7.0; vec3 ns = n_ * D.wyz - D.xzx; vec4 j = p - 49.0 * floor(p * ns.z *ns.z); vec4 x_ = floor(j * ns.z); vec4 y_ = floor(j - 7.0 * x_ ); vec4 x = x_ *ns.x + ns.yyyy; vec4 y = y_ *ns.x + ns.yyyy; vec4 h = 1.0 - abs(x) - abs(y); vec4 b0 = vec4( x.xy, y.xy ); vec4 b1 = vec4( x.zw, y.zw ); vec4 s0 = floor(b0)*2.0 + 1.0; vec4 s1 = floor(b1)*2.0 + 1.0; vec4 sh = -step(h, vec4(0.0)); vec4 a0 = b0.xzyw + s0.xzyw*sh.xxyy ; vec4 a1 = b1.xzyw + s1.xzyw*sh.zzww ; vec3 p0 = vec3(a0.xy,h.x); vec3 p1 = vec3(a0.zw,h.y); vec3 p2 = vec3(a1.xy,h.z); vec3 p3 = vec3(a1.zw,h.w); vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2, p2), dot(p3,p3))); p0 *= norm.x; p1 *= norm.y; p2 *= norm.z; p3 *= norm.w; vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0); m = m * m; return 42.0 * dot( m*m, vec4( dot(p0,x0), dot(p1,x1), dot(p2,x2), dot(p3,x3) ) ); }
  void main() { vec3 pos = position; float noiseFreq = 0.5; float noiseAmp = uDistortion; float noise = snoise(vec3(pos.x * noiseFreq + uTime * 0.1, pos.y * noiseFreq, pos.z * noiseFreq)); vNoise = noise; vec3 newPos = pos + (normalize(pos) * noise * noiseAmp); float dist = distance(uMouse * 10.0, newPos.xy); float interaction = smoothstep(5.0, 0.0, dist); newPos += normalize(pos) * interaction * 0.5; vec4 mvPosition = modelViewMatrix * vec4(newPos, 1.0); gl_Position = projectionMatrix * mvPosition; gl_PointSize = uSize * (24.0 / -mvPosition.z) * (1.0 + noise * 0.5); vAlpha = 1.0; vPos = newPos; }
`;

const fragmentShader = `
  uniform vec3 uColor; uniform float uOpacity; varying float vNoise; varying vec3 vPos;
  void main() { vec2 center = gl_PointCoord - vec2(0.5); float dist = length(center); if (dist > 0.5) discard; float alpha = smoothstep(0.5, 0.2, dist) * uOpacity; vec3 darkColor = uColor * 0.5; vec3 lightColor = uColor * 1.8; vec3 finalColor = mix(darkColor, lightColor, vNoise * 0.5 + 0.5); gl_FragColor = vec4(finalColor, alpha); }
`;

export function Background3D() {
    const containerRef = useRef<HTMLDivElement>(null);
    const uniformsRef = useRef<{
        uTime: { value: number };
        uDistortion: { value: number };
        uSize: { value: number };
        uColor: { value: THREE.Color };
        uOpacity: { value: number };
        uMouse: { value: THREE.Vector2 };
    }>({
        uTime: { value: 0 },
        uDistortion: { value: 0.6 },
        uSize: { value: 2.5 },
        uColor: { value: new THREE.Color("#10b981") },
        uOpacity: { value: 0.6 },
        uMouse: { value: new THREE.Vector2(0, 0) },
    });

    useEffect(() => {
        if (!containerRef.current) return;

        const scene = new THREE.Scene();
        scene.fog = new THREE.FogExp2(0x000000, 0.02);

        const camera = new THREE.PerspectiveCamera(
            50,
            window.innerWidth / window.innerHeight,
            0.1,
            100
        );
        camera.position.set(0, 0, 18);

        const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
        renderer.setSize(window.innerWidth, window.innerHeight);
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        containerRef.current.appendChild(renderer.domElement);

        const systemsGroup = new THREE.Group();
        systemsGroup.position.x = 4.5;
        scene.add(systemsGroup);

        const geometry = new THREE.IcosahedronGeometry(4.5, 30);
        const material = new THREE.ShaderMaterial({
            vertexShader,
            fragmentShader,
            uniforms: uniformsRef.current,
            transparent: true,
            depthWrite: false,
            blending: THREE.NormalBlending,
        });

        const particles = new THREE.Points(geometry, material);
        systemsGroup.add(particles);

        let time = 0;
        let mouseX = 0,
            mouseY = 0;

        const onMouseMove = (e: MouseEvent) => {
            mouseX = (e.clientX / window.innerWidth) * 2 - 1;
            mouseY = -(e.clientY / window.innerHeight) * 2 + 1;
            uniformsRef.current.uMouse.value.x +=
                (mouseX - uniformsRef.current.uMouse.value.x) * 0.05;
            uniformsRef.current.uMouse.value.y +=
                (mouseY - uniformsRef.current.uMouse.value.y) * 0.05;
        };

        const onResize = () => {
            camera.aspect = window.innerWidth / window.innerHeight;
            camera.updateProjectionMatrix();
            renderer.setSize(window.innerWidth, window.innerHeight);

            if (window.innerWidth < 768) {
                systemsGroup.position.set(0, 2, -5);
                systemsGroup.scale.set(0.8, 0.8, 0.8);
            } else {
                systemsGroup.position.set(4.5, 0, 0);
                systemsGroup.scale.set(1, 1, 1);
            }
        };

        window.addEventListener("mousemove", onMouseMove);
        window.addEventListener("resize", onResize);

        // Initial positioning
        onResize();

        const animate = () => {
            time += 0.01;
            systemsGroup.rotation.y = time * 0.05;
            systemsGroup.rotation.z = time * 0.02;
            uniformsRef.current.uTime.value = time;

            // Update color based on dark mode
            const isDark = document.documentElement.classList.contains("dark");
            if (isDark) {
                uniformsRef.current.uColor.value.set("#10b981");
                uniformsRef.current.uOpacity.value = 0.6;
            } else {
                uniformsRef.current.uColor.value.set("#047857");
                uniformsRef.current.uOpacity.value = 0.8;
            }

            renderer.render(scene, camera);
            requestAnimationFrame(animate);
        };

        animate();

        return () => {
            window.removeEventListener("mousemove", onMouseMove);
            window.removeEventListener("resize", onResize);
            renderer.dispose();
            if (containerRef.current) {
                containerRef.current.removeChild(renderer.domElement);
            }
        };
    }, []);

    return (
        <div className="fixed top-0 left-0 w-full h-[120vh] -z-10 overflow-hidden pointer-events-none transition-all duration-700">
            <div
                ref={containerRef}
                className="w-full h-full opacity-100 dark:opacity-80 transition-opacity duration-700"
            ></div>
            <div className="absolute inset-0 bg-gradient-to-b from-white/40 via-white/20 to-white/60 dark:from-black/40 dark:via-black/20 dark:to-black/50 pointer-events-none"></div>
        </div>
    );
}
