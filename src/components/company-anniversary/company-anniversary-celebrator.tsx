"use client";

import React, { useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, Award, PartyPopper, X } from "lucide-react";
import { useSettings } from "@/contexts/settings-context";
import { Button } from "@/components/ui/button";

function getOrdinalSuffix(i: number): string {
	const j = i % 10,
		k = i % 100;
	if (j === 1 && k !== 11) {
		return i + "st";
	}
	if (j === 2 && k !== 12) {
		return i + "nd";
	}
	if (j === 3 && k !== 13) {
		return i + "rd";
	}
	return i + "th";
}

// Celebration Palettes
const CONFETTI_COLORS = [
	"#eab308", // Yellow / Gold
	"#ca8a04", // Darker Gold
	"#f59e0b", // Amber
	"#d97706", // Dark Amber
	"#ffffff", // White Sparkle
	"#3b82f6", // Royal Blue
	"#ec4899", // Pink
	"#a855f7", // Purple
	"#10b981", // Emerald
];

const BALLOON_COLORS = [
	"rgba(234, 179, 8, 0.8)",   // Gold
	"rgba(244, 63, 94, 0.8)",   // Rose
	"rgba(59, 130, 246, 0.8)",  // Blue
	"rgba(168, 85, 247, 0.8)",  // Purple
	"rgba(16, 185, 129, 0.8)",  // Green
	"rgba(249, 115, 22, 0.8)",  // Orange
];

function randomRange(min: number, max: number) {
	return min + Math.random() * (max - min);
}

// ── CONFETTI SPRINKLERS ──
function SprinklerConfetti() {
	const count = 75; // Particles per side
	return (
		<div className='pointer-events-none absolute inset-0 overflow-hidden z-20'>
			{/* Left Bottom Sprinkler (Shoots up-right) */}
			{Array.from({ length: count }).map((_, idx) => {
				const angle = randomRange(20, 70);
				const rad = (angle * Math.PI) / 180;
				const velocity = randomRange(500, 1100);
				const x = Math.cos(rad) * velocity;
				const y = -Math.sin(rad) * velocity;
				const color = CONFETTI_COLORS[idx % CONFETTI_COLORS.length];
				const size = randomRange(7, 15);
				const delay = randomRange(0, 0.6);
				const duration = randomRange(2.0, 3.5);
				const rotation = randomRange(-540, 540);
				const isCircle = idx % 3 === 0;
				const isTriangle = idx % 3 === 1;

				return (
					<motion.div
						key={`left-${idx}`}
						className='absolute left-0 bottom-0'
						style={{
							width: size,
							height: isCircle ? size : isTriangle ? 0 : size / 2,
							backgroundColor: isTriangle ? "transparent" : color,
							borderRadius: isCircle ? "50%" : "2px",
							borderLeft: isTriangle ? `${size / 2}px solid transparent` : undefined,
							borderRight: isTriangle ? `${size / 2}px solid transparent` : undefined,
							borderBottom: isTriangle ? `${size}px solid ${color}` : undefined,
							boxShadow: "0 4px 10px rgba(0,0,0,0.15)",
						}}
						initial={{ x: 0, y: 0, opacity: 1, scale: 0.1, rotate: 0 }}
						animate={{
							x: [0, x * 0.8, x * 1.0, x * 1.1],
							y: [0, y * 0.9, y * 1.0, y * 0.6 + 600], // Up then drop
							opacity: [1, 1, 0.8, 0],
							scale: [0.2, 1.2, 1, 0.4],
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

			{/* Right Bottom Sprinkler (Shoots up-left) */}
			{Array.from({ length: count }).map((_, idx) => {
				const angle = randomRange(110, 160);
				const rad = (angle * Math.PI) / 180;
				const velocity = randomRange(500, 1100);
				const x = Math.cos(rad) * velocity;
				const y = -Math.sin(rad) * velocity;
				const color = CONFETTI_COLORS[idx % CONFETTI_COLORS.length];
				const size = randomRange(7, 15);
				const delay = randomRange(0, 0.6);
				const duration = randomRange(2.0, 3.5);
				const rotation = randomRange(-540, 540);
				const isCircle = idx % 3 === 0;
				const isTriangle = idx % 3 === 1;

				return (
					<motion.div
						key={`right-${idx}`}
						className='absolute right-0 bottom-0'
						style={{
							width: size,
							height: isCircle ? size : isTriangle ? 0 : size / 2,
							backgroundColor: isTriangle ? "transparent" : color,
							borderRadius: isCircle ? "50%" : "2px",
							borderLeft: isTriangle ? `${size / 2}px solid transparent` : undefined,
							borderRight: isTriangle ? `${size / 2}px solid transparent` : undefined,
							borderBottom: isTriangle ? `${size}px solid ${color}` : undefined,
							boxShadow: "0 4px 10px rgba(0,0,0,0.15)",
						}}
						initial={{ x: 0, y: 0, opacity: 1, scale: 0.1, rotate: 0 }}
						animate={{
							x: [0, x * 0.8, x * 1.0, x * 1.1],
							y: [0, y * 0.9, y * 1.0, y * 0.6 + 600], // Up then drop
							opacity: [1, 1, 0.8, 0],
							scale: [0.2, 1.2, 1, 0.4],
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

// ── FLOATING BALLOONS ──
interface BalloonProps {
	color: string;
	size: number;
	delay: number;
	duration: number;
	startX: number;
}

function Balloon({ color, size, delay, duration, startX }: BalloonProps) {
	return (
		<motion.div
			className='absolute bottom-0 z-10 pointer-events-none'
			style={{ left: `${startX}%` }}
			initial={{ y: "110vh", x: 0, opacity: 0, scale: 0.7 }}
			animate={{
				y: "-130vh",
				x: [0, 45, -45, 25, -25, 0],
				opacity: [0, 1, 1, 0],
				scale: [0.7, 1.0, 1.0, 0.8],
			}}
			transition={{
				duration,
				delay,
				ease: "easeInOut",
				repeat: Infinity,
				repeatDelay: randomRange(2, 6),
			}}
		>
			<div className='relative flex flex-col items-center'>
				{/* Balloon Oval */}
				<div
					style={{
						width: size,
						height: size * 1.25,
						backgroundColor: color,
						borderRadius: "50% 50% 50% 50% / 40% 40% 60% 60%",
						boxShadow: `inset -10px -10px 20px rgba(0,0,0,0.2), 0 12px 25px ${color}35`,
					}}
					className='relative'
				>
					{/* Highlight */}
					<div className='absolute top-3 left-4 w-3.5 h-7 bg-white/30 rounded-full rotate-[25deg]' />
				</div>
				{/* Balloon Knot */}
				<div
					style={{
						width: 0,
						height: 0,
						borderLeft: "6px solid transparent",
						borderRight: "6px solid transparent",
						borderTop: `8px solid ${color}`,
						marginTop: "-2px",
					}}
				/>
				{/* Balloon Wavy String */}
				<svg width='20' height='70' className='opacity-40 overflow-visible -mt-0.5'>
					<path
						d='M10 0 Q14 20, 10 40 T10 70'
						fill='transparent'
						stroke='#e2e8f0'
						strokeWidth='1.5'
					/>
				</svg>
			</div>
		</motion.div>
	);
}

export function CompanyAnniversaryCelebrator({
	children,
}: {
	children: React.ReactNode;
}) {
	const { settings, companyAnniversary, isLoading } = useSettings();
	const [isAnniversary, setIsAnniversary] = useState(false);
	const [anniversaryCount, setAnniversaryCount] = useState(0);
	const [dateRangeString, setDateRangeString] = useState("");
	const [showPopup, setShowPopup] = useState(false);
	const [showBanner, setShowBanner] = useState(false);
	const [balloons, setBalloons] = useState<BalloonProps[]>([]);

	const checkAnniversary = useCallback(() => {
		if (!companyAnniversary) {
			setIsAnniversary(false);
			return;
		}

		try {
			const parts = companyAnniversary.split("-");
			if (parts.length !== 3) return;
			const [annivYear, annivMonth, annivDay] = parts.map(Number);

			const today = new Date();
			const currentYear = today.getFullYear();
			const currentMonth = today.getMonth() + 1; // 1-based
			const currentDay = today.getDate();

			const matchesToday = currentMonth === annivMonth && currentDay === annivDay;
			const yearsCount = currentYear - annivYear;

			if (matchesToday && yearsCount > 0) {
				setIsAnniversary(true);
				setAnniversaryCount(yearsCount);

				const formatter = new Intl.DateTimeFormat("en-US", {
					month: "long",
					day: "numeric",
					year: "numeric",
				});
				const startDate = new Date(annivYear, annivMonth - 1, annivDay);
				setDateRangeString(`${formatter.format(startDate)} - ${formatter.format(today)}`);

				// Populate floating balloons
				const generatedBalloons: BalloonProps[] = Array.from({ length: 15 }).map((_, idx) => ({
					color: BALLOON_COLORS[idx % BALLOON_COLORS.length]!,
					size: randomRange(55, 80),
					delay: randomRange(0, 5),
					duration: randomRange(8, 14),
					startX: randomRange(5, 95),
				}));
				setBalloons(generatedBalloons);

				// Check seen state today in localStorage
				const todayKey = `${currentYear}-${currentMonth}-${currentDay}`;
				const storageKey = `company-anniversary-seen-${companyAnniversary}-${todayKey}`;
				const hasSeen = localStorage.getItem(storageKey) === "true";

				if (!hasSeen) {
					setShowPopup(true);
					setShowBanner(false);
				} else {
					setShowPopup(false);
					setShowBanner(true);
				}
			} else {
				setIsAnniversary(false);
			}
		} catch (e) {
			console.error("Error parsing company anniversary date:", e);
			setIsAnniversary(false);
		}
	}, [companyAnniversary]);

	useEffect(() => {
		if (!isLoading) {
			checkAnniversary();
		}
	}, [isLoading, checkAnniversary]);

	useEffect(() => {
		if (showBanner && isAnniversary) {
			document.documentElement.style.setProperty("--anniversary-banner-height", "40px");
		} else {
			document.documentElement.style.setProperty("--anniversary-banner-height", "0px");
		}
		return () => {
			document.documentElement.style.setProperty("--anniversary-banner-height", "0px");
		};
	}, [showBanner, isAnniversary]);

	const handleDismissPopup = () => {
		try {
			const today = new Date();
			const todayKey = `${today.getFullYear()}-${today.getMonth() + 1}-${today.getDate()}`;
			const storageKey = `company-anniversary-seen-${companyAnniversary}-${todayKey}`;
			localStorage.setItem(storageKey, "true");
		} catch (err) {
			console.error(err);
		}
		setShowPopup(false);
		setShowBanner(true);
	};

	const companyName = settings?.company_name || "Our Company";
	const ordinalCount = getOrdinalSuffix(anniversaryCount);

	// Custom formatted title to say "Happy [Xth] Anniversary MM Team!"
	const titleText = `Happy ${ordinalCount} Anniversary MM Team!`;
	const titleWords = titleText.split(" ");

	const titleContainerVariants = {
		hidden: { opacity: 0 },
		visible: {
			opacity: 1,
			transition: {
				staggerChildren: 0.18,
				delayChildren: 0.2,
			},
		},
	};

	const wordVariants = {
		hidden: { opacity: 0, y: 50, scale: 0.7, rotate: -8 },
		visible: {
			opacity: 1,
			y: 0,
			scale: 1,
			rotate: 0,
			transition: {
				type: "spring" as const,
				damping: 11,
				stiffness: 110,
			},
		},
	};

	return (
		<div className='relative min-h-screen flex flex-col w-full'>
			{/* Load Google Fonts Dynamically */}
			<link rel="preconnect" href="https://fonts.googleapis.com" />
			<link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
			<link href="https://fonts.googleapis.com/css2?family=Cinzel+Decorative:wght@700;900&family=Playfair+Display:ital,wght@0,800;0,900;1,900&family=Outfit:wght@800;900&display=swap" rel="stylesheet" />

			{/* Top Banner on Subsequent Visits */}
			<AnimatePresence>
				{showBanner && isAnniversary && (
					<motion.div
						initial={{ height: 0, opacity: 0 }}
						animate={{ height: "auto", opacity: 1 }}
						exit={{ height: 0, opacity: 0 }}
						onClick={() => {
							setShowPopup(true);
							setShowBanner(false);
						}}
						className='relative z-50 w-full bg-gradient-to-r from-amber-500 via-yellow-500 to-amber-600 text-slate-950 font-sans shadow-md py-2 px-4 select-none flex items-center justify-between border-b border-amber-600/30 cursor-pointer'
					>
						<div className='flex items-center gap-2 mx-auto text-xs sm:text-sm font-black tracking-wide uppercase text-center justify-center flex-wrap px-4'>
							<PartyPopper className='h-4 w-4 shrink-0 animate-bounce' />
							<span>🎉 Celebrating {companyName}'s {ordinalCount} Anniversary!</span>
							<span className='opacity-80 font-medium text-[10px] sm:text-xs normal-case bg-black/10 px-2 py-0.5 rounded-full backdrop-blur-xs'>
								{dateRangeString}
							</span>
							<Sparkles className='h-3.5 w-3.5 text-slate-900 fill-slate-900 shrink-0' />
						</div>
						<button
							onClick={(e) => {
								e.stopPropagation();
								setShowBanner(false);
							}}
							className='absolute right-3 top-1/2 -translate-y-1/2 p-1 hover:bg-black/10 rounded-full transition-colors'
							aria-label='Dismiss banner'
						>
							<X className='h-3.5 w-3.5' />
						</button>
					</motion.div>
				)}
			</AnimatePresence>

			{/* Main Children */}
			<div className='flex-1 flex flex-col min-h-0 w-full'>{children}</div>

			{/* Immersive Full Screen Celebration Overlay */}
			<AnimatePresence>
				{showPopup && isAnniversary && (
					<div className='fixed inset-0 z-[100] flex items-center justify-center p-6 bg-slate-950/95 backdrop-blur-lg overflow-hidden select-none'>
						{/* Blast Sprinklers */}
						<SprinklerConfetti />

						{/* Floating Balloons */}
						{balloons.map((balloon, idx) => (
							<Balloon key={idx} {...balloon} />
						))}

						{/* Radial glowing lights in background */}
						<div className='absolute top-1/4 left-1/4 w-[400px] h-[400px] bg-amber-500/10 rounded-full blur-[100px] pointer-events-none' />
						<div className='absolute bottom-1/4 right-1/4 w-[400px] h-[400px] bg-purple-500/10 rounded-full blur-[100px] pointer-events-none' />

						{/* Centered Celebration Panel */}
						<div className='z-30 max-w-3xl flex flex-col items-center text-center px-4'>

							{/* Large Glowing Medal Icon */}
							<motion.div
								initial={{ scale: 0, rotate: -45 }}
								animate={{ scale: 1, rotate: 0 }}
								transition={{ type: "spring", damping: 12, stiffness: 120, delay: 0.1 }}
								className='relative h-28 w-28 rounded-3xl bg-gradient-to-tr from-amber-500/20 to-yellow-400/20 border border-amber-400/40 flex items-center justify-center mb-8 text-yellow-400 shadow-[0_0_50px_rgba(234,179,8,0.2)]'
							>
								<Award className='h-14 w-14 animate-pulse' />
								<Sparkles className='absolute -top-2 -right-2 h-7 w-7 text-yellow-300 animate-bounce' />
							</motion.div>

							{/* Section Tag */}
							<motion.span
								initial={{ opacity: 0, y: 15 }}
								animate={{ opacity: 1, y: 0 }}
								transition={{ delay: 0.2 }}
								className='text-xs sm:text-sm font-black tracking-[0.3em] uppercase text-amber-500 mb-4 bg-amber-500/10 px-4 py-1.5 rounded-full border border-amber-500/20 backdrop-blur-md font-sans'
							>
								Company Milestone
							</motion.span>

							{/* Word-by-Word Title Animation with Playfair Display and Pulsing Text Shadow Glow */}
							<motion.h1
								variants={titleContainerVariants}
								initial='hidden'
								animate='visible'
								className='text-4xl sm:text-6xl md:text-7xl font-extrabold tracking-tight leading-tight mb-5 flex flex-wrap justify-center gap-x-4 gap-y-2'
								style={{ fontFamily: "'Playfair Display', 'Cinzel Decorative', serif" }}
							>
								{titleWords.map((word, index) => (
									<motion.span
										key={index}
										variants={wordVariants}
										className='inline-block bg-gradient-to-r from-amber-200 via-yellow-400 to-amber-300 bg-clip-text text-transparent'
										animate={{
											textShadow: [
												"0 0 10px rgba(234, 179, 8, 0.4), 0 0 20px rgba(234, 179, 8, 0.2)",
												"0 0 25px rgba(234, 179, 8, 0.8), 0 0 45px rgba(234, 179, 8, 0.5), 0 0 60px rgba(234, 179, 8, 0.3)",
												"0 0 10px rgba(234, 179, 8, 0.4), 0 0 20px rgba(234, 179, 8, 0.2)"
											]
										}}
										transition={{
											duration: 3,
											repeat: Infinity,
											ease: "easeInOut",
											delay: index * 0.1
										}}
									>
										{word}
									</motion.span>
								))}
							</motion.h1>

							{/* Company Name */}
							{/* <motion.p
								initial={{ opacity: 0, y: 20 }}
								animate={{ opacity: 1, y: 0 }}
								transition={{ delay: 1.0, type: "spring" }}
								className='text-xl sm:text-2xl font-black text-slate-100 mb-6 drop-shadow-md'
								style={{ fontFamily: "'Outfit', sans-serif" }}
							>
								{companyName}
							</motion.p> */}

							{/* Date Range Badge */}
							<motion.div
								initial={{ opacity: 0, scale: 0.9 }}
								animate={{ opacity: 1, scale: 1 }}
								transition={{ delay: 1.2 }}
								className='inline-flex items-center gap-2 rounded-full border border-amber-500/30 bg-amber-500/5 px-5 py-2 text-xs sm:text-sm font-bold text-amber-300 mb-10 shadow-[0_4px_20px_rgba(234, 179, 8, 0.05)] backdrop-blur-md font-sans'
							>
								<span>{dateRangeString}</span>
							</motion.div>

							{/* Celebratory Message */}
							<motion.div
								initial={{ opacity: 0 }}
								animate={{ opacity: 1 }}
								transition={{ delay: 1.4, duration: 0.8 }}
								className='w-full border-t border-slate-800/80 pt-8 mb-10'
							>
								<p className='text-white text-sm sm:text-base leading-relaxed max-w-2xl mx-auto drop-shadow-sm font-medium font-sans'>
									Our heartfelt congratulations and deepest gratitude to <span style={{ fontFamily: "'Cinzel Decorative', serif", fontWeight: 900 }} className="bg-gradient-to-r from-amber-200 via-yellow-400 to-amber-300 bg-clip-text text-transparent drop-shadow-[0_2px_12px_rgba(234,179,8,0.4)]">Kartik Agarwal</span> and <span style={{ fontFamily: "'Cinzel Decorative', serif", fontWeight: 900 }} className="bg-gradient-to-r from-amber-200 via-yellow-400 to-amber-300 bg-clip-text text-transparent drop-shadow-[0_2px_12px_rgba(234,179,8,0.4)]">Ashwin Arya</span> Sir for their inspiring guidance and vision. It is under their leadership that we scale new heights and create magic everyday. Cheers to another year of growing, achieving, and shining together as one MM family!
								</p>
							</motion.div>

							{/* Large CTA Button */}
							<motion.div
								initial={{ opacity: 0, y: 20 }}
								animate={{ opacity: 1, y: 0 }}
								transition={{ delay: 1.6, type: "spring" }}
							>
								<Button
									onClick={handleDismissPopup}
									className='rounded-2xl h-14 px-10 text-xs sm:text-sm font-black tracking-widest uppercase bg-gradient-to-r from-amber-500 via-yellow-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 font-bold border-2 border-yellow-300/30 shadow-[0_10px_35px_rgba(234, 179, 8, 0.3)] hover:shadow-[0_12px_45px_rgba(234, 179, 8, 0.4)] transition-all hover:scale-[1.04] active:scale-[0.98] font-sans'
								>
									Celebrate &amp; Continue 🎉
								</Button>
							</motion.div>
						</div>
					</div>
				)}
			</AnimatePresence>
		</div>
	);
}
