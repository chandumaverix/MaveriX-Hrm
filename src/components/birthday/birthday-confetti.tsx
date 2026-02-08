"use client";

import { motion } from "framer-motion";

const COLORS = [
	"#ec4899",
	"#f43f5e",
	"#f97316",
	"#eab308",
	"#22c55e",
	"#14b8a6",
	"#3b82f6",
	"#8b5cf6",
];
const PARTICLE_COUNT = 80;

function random(min: number, max: number) {
	return min + Math.random() * (max - min);
}

export function BirthdayConfetti() {
	return (
		<div className='pointer-events-none absolute inset-0 overflow-hidden'>
			{Array.from({ length: PARTICLE_COUNT }, (_, i) => {
				const angle = (i / PARTICLE_COUNT) * 360 + random(0, 30);
				const rad = (angle * Math.PI) / 180;
				const distance = 80 + random(0, 200);
				const x = Math.cos(rad) * distance + 50;
				const y = Math.sin(rad) * distance + 50;
				const color = COLORS[i % COLORS.length];
				const size = 6 + random(0, 6);
				const delay = random(0, 0.3);
				const duration = 1.5 + random(0.5, 1);
				const rotation = random(-180, 180);
				return (
					<motion.div
						key={i}
						className='absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-sm'
						style={{
							width: size,
							height: size,
							backgroundColor: color,
							boxShadow: "0 0 4px rgba(0,0,0,0.2)",
						}}
						initial={{ x: 0, y: 0, opacity: 1, rotate: 0 }}
						animate={{
							x: (x - 50) * 8,
							y: (y - 50) * 8 + 200,
							opacity: 0,
							rotate: rotation,
						}}
						transition={{
							duration,
							delay,
							ease: "easeOut",
						}}
					/>
				);
			})}
		</div>
	);
}
