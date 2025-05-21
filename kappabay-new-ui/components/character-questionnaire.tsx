"use client";

import type React from "react";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Slider } from "@/components/ui/slider";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Check, ChevronLeft, ChevronRight, Sparkles, Volume2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface CharacterQuestionnaireProps {
	onComplete: (config: any) => void;
	initialConfig?: any;
}

// Animation variants
const pageVariants = {
	hidden: { opacity: 0, x: 100 },
	visible: { opacity: 1, x: 0 },
	exit: { opacity: 0, x: -100 },
};

const CharacterQuestionnaire: React.FC<CharacterQuestionnaireProps> = ({ onComplete, initialConfig }) => {
	const [step, setStep] = useState(0);
	const [config, setConfig] = useState(
		initialConfig || {
			visualStyle: "",
			archetype: "",
			sliderValues: {
				sociability: 3,
				energy: 3,
				quirkiness: 3,
				affection: 3,
				humor: 3,
			},
			roles: [],
			commStyle: "",
			world: "",
			origin: "",
			lore: "",
			artStyle: "",
			hair: "",
			eyes: "",
			build: "",
			attire: "",
			accessory: "",
			voiceModel: "en_US-female-soft",
			gender: "female",
			tone: "soft",
			name: "",
			topTraits: ["Friendly", "Caring", "Playful"],
		}
	);

	// Archetypes based on visual style
	const archetypes = {
		anime: [
			{ value: "deredere", label: "Deredere", icon: "🎀", description: "Endlessly sweet" },
			{ value: "tsundere", label: "Tsundere", icon: "😡", description: "Prickly → caring" },
			{ value: "yandere", label: "Yandere", icon: "🔪", description: "Obsessive love" },
			{ value: "bookworm", label: "Bookworm / Dandere", icon: "📚", description: "Shy intellectual" },
			{ value: "tomboy", label: "Tomboy Rival", icon: "🏃", description: "Athletic, competitive" },
			{ value: "gyaru", label: "Gyaru", icon: "🌞", description: "Sun-kissed, fashion-forward" },
			{ value: "magical_girl", label: "Magical-Girl Guardian", icon: "🧙", description: "Magical powers" },
			{ value: "catgirl", label: "Catgirl Trickster", icon: "🐈", description: "Playful, mischievous" },
			{ value: "cool_senpai", label: "Cool Senpai", icon: "🕶", description: "Calm, aloof" },
			{ value: "elf_princess", label: "Isekai Elf Princess", icon: "🌌", description: "Otherworldly royalty" },
		],
		realistic: [
			{ value: "cafe_barista", label: "Indie Café Barista", icon: "☕", description: "Artsy, warm" },
			{ value: "software_engineer", label: "Software Engineer Roommate", icon: "💻", description: "Witty, logical" },
			{ value: "indie_vocalist", label: "Indie Band Vocalist", icon: "🎸", description: "Creative, moody" },
			{ value: "personal_trainer", label: "Personal Trainer", icon: "🏋️", description: "Motivating, energetic" },
			{ value: "night_nurse", label: "Night-Shift Nurse", icon: "🚑", description: "Caring, resilient" },
			{ value: "nomad_blogger", label: "Digital Nomad Blogger", icon: "✈️", description: "Adventurous" },
			{ value: "variety_streamer", label: "Variety Streamer", icon: "🎮", description: "Meme-savvy, chatty" },
			{ value: "publishing_editor", label: "Publishing Editor", icon: "📚", description: "Bookish, sarcastic" },
			{ value: "standup_comedian", label: "Stand-up Comedian", icon: "🎤", description: "Quick, playful roasts" },
			{ value: "mindfulness_coach", label: "Mindfulness Coach", icon: "🧘", description: "Calm, encouraging" },
		],
	};

	// Role chips
	const roleOptions = [
		{ value: "mentor", label: "Mentor" },
		{ value: "best-friend", label: "Best Friend" },
		{ value: "teasing-big-sis", label: "Teasing Big Sis" },
		{ value: "wholesome-partner", label: "Wholesome Partner" },
		{ value: "chaotic-rival", label: "Chaotic Rival" },
		{ value: "protector", label: "Protector" },
		{ value: "student", label: "Student" },
		{ value: "muse", label: "Muse" },
		{ value: "accountability-buddy", label: "Accountability Buddy" },
		{ value: "co-streamer", label: "Co-Streamer" },
	];

	// Communication styles
	const commStyles = [
		{ value: "emoji-heavy", label: "Emoji-heavy", icon: "🤗" },
		{ value: "poetic", label: "Poetic", icon: "📜" },
		{ value: "gamer-slang", label: "Gamer Slang", icon: "🎮" },
		{ value: "formal", label: "Formal", icon: "🏰" },
		{ value: "sarcastic", label: "Sarcastic", icon: "😏" },
		{ value: "chill", label: "Chill", icon: "✌️" },
	];

	// World settings
	const worldSettings = {
		anime: [
			{ value: "slice-of-life", label: "Slice-of-Life", icon: "🌸" },
			{ value: "cyberpunk", label: "Cyberpunk", icon: "🌆" },
			{ value: "high-fantasy", label: "High-Fantasy", icon: "🏰" },
			{ value: "underwater-realm", label: "Underwater Realm", icon: "🌊" },
			{ value: "steampunk", label: "Steampunk", icon: "⚙️" },
			{ value: "space-opera", label: "Space Opera", icon: "🚀" },
			{ value: "post-apocalypse", label: "Post-Apocalypse", icon: "☢️" },
		],
		realistic: [
			{ value: "modern-city-life", label: "Modern City Life", icon: "🏙" },
			{ value: "college-campus", label: "College Campus", icon: "🎓" },
			{ value: "small-town", label: "Small Town", icon: "🏡" },
			{ value: "tech-startup", label: "Tech Startup", icon: "💼" },
			{ value: "constant-travel", label: "Constant Travel", icon: "🌍" },
			{ value: "creative-studio", label: "Creative Studio", icon: "🎨" },
		],
	};

	// Origin twists
	const originTwists = {
		anime: [
			{ value: "orphan-turned-hero", label: "Orphan-Turned-Hero" },
			{ value: "ancient-royalty", label: "Ancient Royalty" },
			{ value: "experiment-gone-right", label: "Experiment-Gone-Right" },
			{ value: "reincarnated-legend", label: "Reincarnated Legend" },
			{ value: "runaway-idol", label: "Runaway Idol" },
			{ value: "ai-born-sentience", label: "AI-Born Sentience" },
		],
		realistic: [
			{ value: "moved-from-abroad", label: "Moved-From-Abroad" },
			{ value: "career-switch", label: "Career-Switch" },
			{ value: "self-taught-prodigy", label: "Self-Taught Prodigy" },
			{ value: "childhood-friend", label: "Childhood Friend" },
			{ value: "viral-sensation", label: "Viral Sensation" },
			{ value: "comeback-story", label: "Comeback Story" },
		],
	};

	// Appearance options
	const appearanceOptions = {
		artStyle: {
			anime: [
				{ value: "cell-shade", label: "Cell-Shade" },
				{ value: "watercolor", label: "Watercolor" },
				{ value: "pixel", label: "Pixel" },
				{ value: "3d-toon", label: "3D-Toon" },
			],
			realistic: [
				{ value: "photo-studio", label: "Photo-Studio" },
				{ value: "film-grain", label: "Film-Grain" },
				{ value: "fashion-editorial", label: "Fashion-Editorial" },
			],
		},
		hair: {
			anime: [
				{ value: "pink-long", label: "Pink (Long)" },
				{ value: "blue-short", label: "Blue (Short)" },
				{ value: "blonde-bob", label: "Blonde (Bob)" },
				{ value: "purple-long", label: "Purple (Long)" },
				{ value: "red-short", label: "Red (Short)" },
				{ value: "green-bob", label: "Green (Bob)" },
			],
			realistic: [
				{ value: "brown-long", label: "Brown (Long)" },
				{ value: "black-short", label: "Black (Short)" },
				{ value: "blonde-bob", label: "Blonde (Bob)" },
				{ value: "auburn-long", label: "Auburn (Long)" },
				{ value: "red-short", label: "Red (Short)" },
				{ value: "brunette-bob", label: "Brunette (Bob)" },
			],
		},
		eyes: {
			anime: [
				{ value: "azure-large", label: "Azure (Large)" },
				{ value: "amber-large", label: "Amber (Large)" },
				{ value: "emerald-large", label: "Emerald (Large)" },
				{ value: "ruby-large", label: "Ruby (Large)" },
			],
			realistic: [
				{ value: "blue", label: "Blue" },
				{ value: "brown", label: "Brown" },
				{ value: "green", label: "Green" },
				{ value: "hazel", label: "Hazel" },
				{ value: "heterochromia", label: "Heterochromia" },
			],
		},
		build: [
			{ value: "petite", label: "Petite" },
			{ value: "athletic", label: "Athletic" },
			{ value: "curvy", label: "Curvy" },
			{ value: "statuesque", label: "Statuesque" },
		],
		attire: {
			anime: [
				{ value: "sailor-uniform", label: "Sailor Uniform" },
				{ value: "witch-robes", label: "Witch Robes" },
				{ value: "mech-suit", label: "Mech-Suit" },
				{ value: "idol-dress", label: "Idol Dress" },
				{ value: "kunoichi", label: "Kunoichi" },
				{ value: "streetwear", label: "Streetwear" },
			],
			realistic: [
				{ value: "casual-streetwear", label: "Casual Streetwear" },
				{ value: "business-casual", label: "Business Casual" },
				{ value: "scrubs", label: "Scrubs" },
				{ value: "gym-gear", label: "Gym Gear" },
				{ value: "festival-look", label: "Festival Look" },
			],
		},
		accessory: {
			anime: [
				{ value: "katana", label: "Katana" },
				{ value: "spellbook", label: "Spellbook" },
				{ value: "floating-orb", label: "Floating Orb" },
				{ value: "fox-ears", label: "Fox Ears" },
				{ value: "hoverboard", label: "Hoverboard" },
			],
			realistic: [
				{ value: "latte-art-pen", label: "Latte-Art Pen" },
				{ value: "dslr", label: "DSLR" },
				{ value: "guitar", label: "Guitar" },
				{ value: "smartwatch", label: "Smartwatch" },
				{ value: "headphones", label: "Headphones" },
			],
		},
	};

	// Voice options
	const voiceOptions = {
		gender: [
			{ value: "female", label: "Female" },
			{ value: "androgynous", label: "Androgynous" },
			{ value: "male", label: "Male" },
		],
		tone: [
			{ value: "soft", label: "Soft" },
			{ value: "upbeat", label: "Upbeat" },
			{ value: "regal", label: "Regal" },
			{ value: "raspy", label: "Raspy" },
			{ value: "energetic", label: "Energetic" },
		],
	};

	// Update voice model when gender or tone changes
	useEffect(() => {
		if (config.gender && config.tone) {
			setConfig({
				...config,
				voiceModel: `en_US-${config.gender}-${config.tone}`,
			});
		}
	}, [config.gender, config.tone]);

	// Generate top traits based on slider values
	useEffect(() => {
		const traits = [];
		const { sociability, energy, quirkiness, affection, humor } = config.sliderValues;

		if (sociability >= 4) traits.push("Outgoing");
		else if (sociability <= 2) traits.push("Reserved");

		if (energy >= 4) traits.push("Energetic");
		else if (energy <= 2) traits.push("Calm");

		if (quirkiness >= 4) traits.push("Quirky");
		else if (quirkiness <= 2) traits.push("Grounded");

		if (affection >= 4) traits.push("Affectionate");
		else if (affection <= 2) traits.push("Independent");

		if (humor >= 4) traits.push("Humorous");
		else if (humor <= 2) traits.push("Serious");

		// Ensure we have at least 3 traits
		const defaultTraits = ["Friendly", "Caring", "Playful"];
		const finalTraits = traits.length >= 3 ? traits.slice(0, 3) : [...traits, ...defaultTraits].slice(0, 3);

		setConfig({
			...config,
			topTraits: finalTraits,
		});
	}, [config.sliderValues, setConfig]);

	const handleInputChange = (field: string, value: any) => {
		setConfig({ ...config, [field]: value });
	};

	const handleSliderChange = (name: string, value: number[]) => {
		setConfig({
			...config,
			sliderValues: {
				...config.sliderValues,
				[name]: value[0],
			},
		});
	};

	const toggleRole = (role: string) => {
		const roles = [...config.roles];
		const index = roles.indexOf(role);

		if (index === -1) {
			roles.push(role);
		} else {
			roles.splice(index, 1);
		}

		setConfig({ ...config, roles });
	};

	const handleNext = () => {
		if (step < 7) {
			setStep(step + 1);
		} else {
			onComplete(config);
		}
	};

	const handleBack = () => {
		if (step > 0) {
			setStep(step - 1);
		}
	};

	const handleRandomize = () => {
		// Randomize slider values
		const randomSliders = {
			sociability: Math.floor(Math.random() * 5) + 1,
			energy: Math.floor(Math.random() * 5) + 1,
			quirkiness: Math.floor(Math.random() * 5) + 1,
			affection: Math.floor(Math.random() * 5) + 1,
			humor: Math.floor(Math.random() * 5) + 1,
		};

		setConfig({
			...config,
			sliderValues: randomSliders,
		});
	};

	const playVoicePreview = () => {
		// In a real app, this would play a voice sample
		alert(`Playing voice preview: ${config.voiceModel}`);
	};

	// Generate 3 AI suggested names based on archetype and style
	const suggestNames = () => {
		const archetypeNames = {
			deredere: ["Sakura", "Hana", "Mio"],
			tsundere: ["Rin", "Asuka", "Natsuki"],
			yandere: ["Yuno", "Ayano", "Rena"],
			bookworm: ["Yuki", "Nagisa", "Ami"],
			tomboy: ["Makoto", "Tomo", "Ritsu"],
			gyaru: ["Gyaru", "Ran", "Aya"],
			magical_girl: ["Madoka", "Usagi", "Hikari"],
			catgirl: ["Neko", "Mimi", "Koneko"],
			cool_senpai: ["Miyuki", "Setsuna", "Rei"],
			elf_princess: ["Sylvia", "Tiamat", "Elwyn"],
			cafe_barista: ["Emma", "Olivia", "Sophie"],
			software_engineer: ["Ada", "Grace", "Jade"],
			indie_vocalist: ["Luna", "Aria", "Melody"],
			personal_trainer: ["Alex", "Zoe", "Skyler"],
			night_nurse: ["Claire", "Evelyn", "Serena"],
			nomad_blogger: ["Maya", "Nova", "Sage"],
			variety_streamer: ["Pixel", "Twitch", "Gigi"],
			publishing_editor: ["Harper", "Quinn", "Avery"],
			standup_comedian: ["Riley", "Casey", "Jordan"],
			mindfulness_coach: ["Willow", "River", "Autumn"],
		};

		const defaultNames = ["Miku", "Kira", "Yui"];
		return config.archetype && archetypeNames[config.archetype] ? archetypeNames[config.archetype] : defaultNames;
	};

	const suggestedNames = suggestNames();

	// Determine if the current step is complete
	const isStepComplete = () => {
		switch (step) {
			case 0: // Visual Style
				return !!config.visualStyle;
			case 1: // Archetype
				return !!config.archetype;
			case 2: // Personality
				return true; // Sliders always have a value
			case 3: // Relationship
				return config.roles.length > 0 && !!config.commStyle;
			case 4: // World & Lore
				return !!config.world && !!config.origin;
			case 5: // Appearance
				return (
					!!config.artStyle && !!config.hair && !!config.eyes && !!config.build && !!config.attire && !!config.accessory
				);
			case 6: // Voice
				return !!config.gender && !!config.tone;
			case 7: // Name & Preview
				return !!config.name;
			default:
				return false;
		}
	};

	// Render the current step
	const renderStep = () => {
		switch (step) {
			case 0:
				return (
					<div className="space-y-6">
						<div className="text-center mb-6">
							<h2 className="text-2xl font-bold">What kind of companion are you imagining?</h2>
							<p className="text-muted-foreground mt-2">Choose a visual style for your digital companion</p>
						</div>

						<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
							<Card
								className={cn(
									"cursor-pointer transition-all hover:border-primary",
									config.visualStyle === "anime" && "border-primary bg-primary/5"
								)}
								onClick={() => handleInputChange("visualStyle", "anime")}
							>
								<CardContent className="p-6 flex flex-col items-center text-center">
									<div className="w-24 h-24 rounded-full bg-primary/10 flex items-center justify-center mb-4">
										<span className="text-4xl">🌸</span>
									</div>
									<h3 className="text-xl font-bold mb-2">Anime / Stylized</h3>
									<p className="text-muted-foreground">Expressive, colorful characters with stylized features</p>
									{config.visualStyle === "anime" && <Badge className="mt-4 bg-primary">Selected</Badge>}
								</CardContent>
							</Card>

							<Card
								className={cn(
									"cursor-pointer transition-all hover:border-primary",
									config.visualStyle === "realistic" && "border-primary bg-primary/5"
								)}
								onClick={() => handleInputChange("visualStyle", "realistic")}
							>
								<CardContent className="p-6 flex flex-col items-center text-center">
									<div className="w-24 h-24 rounded-full bg-primary/10 flex items-center justify-center mb-4">
										<span className="text-4xl">👩</span>
									</div>
									<h3 className="text-xl font-bold mb-2">Realistic / Relatable</h3>
									<p className="text-muted-foreground">Contemporary, realistic characters with natural features</p>
									{config.visualStyle === "realistic" && <Badge className="mt-4 bg-primary">Selected</Badge>}
								</CardContent>
							</Card>
						</div>
					</div>
				);

			case 1:
				return (
					<div className="space-y-6">
						<div className="text-center mb-6">
							<h2 className="text-2xl font-bold">Pick an Archetype</h2>
							<p className="text-muted-foreground mt-2">Choose a personality archetype that resonates with you</p>
						</div>

						<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
							{config.visualStyle &&
								archetypes[config.visualStyle].map((archetype) => (
									<Card
										key={archetype.value}
										className={cn(
											"cursor-pointer transition-all hover:border-primary",
											config.archetype === archetype.value && "border-primary bg-primary/5"
										)}
										onClick={() => handleInputChange("archetype", archetype.value)}
									>
										<CardContent className="p-4 flex items-start">
											<div className="text-2xl mr-3">{archetype.icon}</div>
											<div>
												<h3 className="font-bold">{archetype.label}</h3>
												<p className="text-sm text-muted-foreground">{archetype.description}</p>
											</div>
											{config.archetype === archetype.value && <Check className="ml-auto h-5 w-5 text-primary" />}
										</CardContent>
									</Card>
								))}
						</div>
					</div>
				);

			case 2:
				return (
					<div className="space-y-6">
						<div className="text-center mb-6">
							<h2 className="text-2xl font-bold">Personality Tune-Up</h2>
							<p className="text-muted-foreground mt-2">
								Adjust these sliders to fine-tune your companion's personality
							</p>
						</div>

						<div className="space-y-8 max-w-2xl mx-auto">
							<div className="space-y-6">
								<div className="space-y-4">
									<div className="flex justify-between">
										<Label>Sociability</Label>
										<span className="text-muted-foreground"></span>
									</div>
									<Slider
										value={[config.sliderValues.sociability]}
										min={1}
										max={5}
										step={1}
										onValueChange={(value) => handleSliderChange("sociability", value)}
									/>
									<div className="flex justify-between text-xs text-muted-foreground">
										<span>Wallflower</span>
										<span>Life-of-party</span>
									</div>
								</div>

								<div className="space-y-4">
									<div className="flex justify-between">
										<Label>Energy</Label>
										<span className="text-muted-foreground"></span>
									</div>
									<Slider
										value={[config.sliderValues.energy]}
										min={1}
										max={5}
										step={1}
										onValueChange={(value) => handleSliderChange("energy", value)}
									/>
									<div className="flex justify-between text-xs text-muted-foreground">
										<span>Chill</span>
										<span>Hyperdrive</span>
									</div>
								</div>

								<div className="space-y-4">
									<div className="flex justify-between">
										<Label>Quirkiness</Label>
										<span className="text-muted-foreground"></span>
									</div>
									<Slider
										value={[config.sliderValues.quirkiness]}
										min={1}
										max={5}
										step={1}
										onValueChange={(value) => handleSliderChange("quirkiness", value)}
									/>
									<div className="flex justify-between text-xs text-muted-foreground">
										<span>Grounded</span>
										<span>Wildcard</span>
									</div>
								</div>

								<div className="space-y-4">
									<div className="flex justify-between">
										<Label>Affection</Label>
										<span className="text-muted-foreground"></span>
									</div>
									<Slider
										value={[config.sliderValues.affection]}
										min={1}
										max={5}
										step={1}
										onValueChange={(value) => handleSliderChange("affection", value)}
									/>
									<div className="flex justify-between text-xs text-muted-foreground">
										<span>Tsundere-ish</span>
										<span>Lovey-dovey</span>
									</div>
								</div>

								<div className="space-y-4">
									<div className="flex justify-between">
										<Label>Humor</Label>
										<span className="text-muted-foreground"></span>
									</div>
									<Slider
										value={[config.sliderValues.humor]}
										min={1}
										max={5}
										step={1}
										onValueChange={(value) => handleSliderChange("humor", value)}
									/>
									<div className="flex justify-between text-xs text-muted-foreground">
										<span>Dry</span>
										<span>Goofy</span>
									</div>
								</div>
							</div>

							<Button variant="outline" className="w-full" onClick={handleRandomize}>
								<Sparkles className="mr-2 h-4 w-4" />
								Surprise Me
							</Button>
						</div>
					</div>
				);

			case 3:
				return (
					<div className="space-y-6">
						<div className="text-center mb-6">
							<h2 className="text-2xl font-bold">Relationship Dynamics</h2>
							<p className="text-muted-foreground mt-2">Define how your companion relates to you</p>
						</div>

						<div className="space-y-8">
							<div className="space-y-4">
								<Label>Role chips (select multiple)</Label>
								<div className="flex flex-wrap gap-2">
									{roleOptions.map((role) => (
										<Badge
											key={role.value}
											variant={config.roles.includes(role.value) ? "default" : "outline"}
											className="cursor-pointer px-3 py-1 hover:bg-primary/20"
											onClick={() => toggleRole(role.value)}
										>
											{role.label}
										</Badge>
									))}
								</div>
							</div>

							<div className="space-y-4">
								<Label>Communication style (pick one)</Label>
								<div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
									{commStyles.map((style) => (
										<Card
											key={style.value}
											className={cn(
												"cursor-pointer transition-all hover:border-primary",
												config.commStyle === style.value && "border-primary bg-primary/5"
											)}
											onClick={() => handleInputChange("commStyle", style.value)}
										>
											<CardContent className="p-3 flex items-center">
												<div className="text-xl mr-2">{style.icon}</div>
												<div className="text-sm">{style.label}</div>
												{config.commStyle === style.value && <Check className="ml-auto h-4 w-4 text-primary" />}
											</CardContent>
										</Card>
									))}
								</div>
							</div>
						</div>
					</div>
				);

			case 4:
				return (
					<div className="space-y-6">
						<div className="text-center mb-6">
							<h2 className="text-2xl font-bold">World & Lore Snapshot</h2>
							<p className="text-muted-foreground mt-2">Define the world and backstory of your companion</p>
						</div>

						<div className="space-y-8">
							<div className="space-y-4">
								<Label>World setting</Label>
								<div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
									{config.visualStyle &&
										worldSettings[config.visualStyle].map((setting) => (
											<Card
												key={setting.value}
												className={cn(
													"cursor-pointer transition-all hover:border-primary",
													config.world === setting.value && "border-primary bg-primary/5"
												)}
												onClick={() => handleInputChange("world", setting.value)}
											>
												<CardContent className="p-3 flex flex-col items-center text-center">
													<div className="text-2xl mb-1">{setting.icon}</div>
													<div className="text-sm">{setting.label}</div>
												</CardContent>
											</Card>
										))}
								</div>
							</div>

							<div className="space-y-4">
								<Label>Origin twist</Label>
								<div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
									{config.visualStyle &&
										originTwists[config.visualStyle].map((origin) => (
											<Card
												key={origin.value}
												className={cn(
													"cursor-pointer transition-all hover:border-primary",
													config.origin === origin.value && "border-primary bg-primary/5"
												)}
												onClick={() => handleInputChange("origin", origin.value)}
											>
												<CardContent className="p-3 flex items-center justify-center text-center">
													<div className="text-sm">{origin.label}</div>
												</CardContent>
											</Card>
										))}
								</div>
							</div>

							<div className="space-y-4">
								<div className="flex items-center">
									<Label htmlFor="lore" className="mr-2">
										One-line lore snippet
									</Label>
									<span className="text-xs text-muted-foreground">(optional, ≤ 120 chars)</span>
								</div>
								<Textarea
									id="lore"
									placeholder="Add a unique detail to your companion's backstory..."
									value={config.lore}
									onChange={(e) => handleInputChange("lore", e.target.value)}
									maxLength={120}
									className="resize-none"
								/>
								<div className="text-xs text-right text-muted-foreground">{config.lore.length}/120 characters</div>
							</div>
						</div>
					</div>
				);

			case 5:
				return (
					<div className="space-y-6">
						<div className="text-center mb-6">
							<h2 className="text-2xl font-bold">Looks & Vibe</h2>
							<p className="text-muted-foreground mt-2">Customize your companion's appearance</p>
						</div>

						<div className="space-y-8">
							<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
								<div className="space-y-4">
									<Label>Art-style sub-filter</Label>
									<div className="grid grid-cols-2 gap-2">
										{config.visualStyle &&
											appearanceOptions.artStyle[config.visualStyle].map((style) => (
												<Card
													key={style.value}
													className={cn(
														"cursor-pointer transition-all hover:border-primary",
														config.artStyle === style.value && "border-primary bg-primary/5"
													)}
													onClick={() => handleInputChange("artStyle", style.value)}
												>
													<CardContent className="p-3 flex items-center justify-center">
														<div className="text-sm">{style.label}</div>
													</CardContent>
												</Card>
											))}
									</div>
								</div>

								<div className="space-y-4">
									<Label>Hair</Label>
									<div className="grid grid-cols-2 gap-2">
										{config.visualStyle &&
											appearanceOptions.hair[config.visualStyle].map((hair) => (
												<Card
													key={hair.value}
													className={cn(
														"cursor-pointer transition-all hover:border-primary",
														config.hair === hair.value && "border-primary bg-primary/5"
													)}
													onClick={() => handleInputChange("hair", hair.value)}
												>
													<CardContent className="p-3 flex items-center justify-center">
														<div className="text-sm">{hair.label}</div>
													</CardContent>
												</Card>
											))}
									</div>
								</div>
							</div>

							<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
								<div className="space-y-4">
									<Label>Eyes</Label>
									<div className="grid grid-cols-2 gap-2">
										{config.visualStyle &&
											appearanceOptions.eyes[config.visualStyle].map((eyes) => (
												<Card
													key={eyes.value}
													className={cn(
														"cursor-pointer transition-all hover:border-primary",
														config.eyes === eyes.value && "border-primary bg-primary/5"
													)}
													onClick={() => handleInputChange("eyes", eyes.value)}
												>
													<CardContent className="p-3 flex items-center justify-center">
														<div className="text-sm">{eyes.label}</div>
													</CardContent>
												</Card>
											))}
									</div>
								</div>

								<div className="space-y-4">
									<Label>Build</Label>
									<div className="grid grid-cols-2 gap-2">
										{appearanceOptions.build.map((build) => (
											<Card
												key={build.value}
												className={cn(
													"cursor-pointer transition-all hover:border-primary",
													config.build === build.value && "border-primary bg-primary/5"
												)}
												onClick={() => handleInputChange("build", build.value)}
											>
												<CardContent className="p-3 flex items-center justify-center">
													<div className="text-sm">{build.label}</div>
												</CardContent>
											</Card>
										))}
									</div>
								</div>
							</div>

							<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
								<div className="space-y-4">
									<Label>Outfit</Label>
									<div className="grid grid-cols-2 gap-2">
										{config.visualStyle &&
											appearanceOptions.attire[config.visualStyle].map((attire) => (
												<Card
													key={attire.value}
													className={cn(
														"cursor-pointer transition-all hover:border-primary",
														config.attire === attire.value && "border-primary bg-primary/5"
													)}
													onClick={() => handleInputChange("attire", attire.value)}
												>
													<CardContent className="p-3 flex items-center justify-center">
														<div className="text-sm">{attire.label}</div>
													</CardContent>
												</Card>
											))}
									</div>
								</div>

								<div className="space-y-4">
									<Label>Accessory</Label>
									<div className="grid grid-cols-2 gap-2">
										{config.visualStyle &&
											appearanceOptions.accessory[config.visualStyle].map((accessory) => (
												<Card
													key={accessory.value}
													className={cn(
														"cursor-pointer transition-all hover:border-primary",
														config.accessory === accessory.value && "border-primary bg-primary/5"
													)}
													onClick={() => handleInputChange("accessory", accessory.value)}
												>
													<CardContent className="p-3 flex items-center justify-center">
														<div className="text-sm">{accessory.label}</div>
													</CardContent>
												</Card>
											))}
									</div>
								</div>
							</div>
						</div>
					</div>
				);

			case 6:
				return (
					<div className="space-y-6">
						<div className="text-center mb-6">
							<h2 className="text-2xl font-bold">Voice & Audio</h2>
							<p className="text-muted-foreground mt-2">Choose how your companion sounds</p>
						</div>

						<div className="space-y-8 max-w-2xl mx-auto">
							<div className="space-y-4">
								<Label>Gender</Label>
								<RadioGroup
									value={config.gender}
									onValueChange={(value) => handleInputChange("gender", value)}
									className="grid grid-cols-3 gap-4"
								>
									{voiceOptions.gender.map((option) => (
										<div key={option.value} className="flex items-center space-x-2">
											<RadioGroupItem value={option.value} id={`gender-${option.value}`} />
											<Label htmlFor={`gender-${option.value}`}>{option.label}</Label>
										</div>
									))}
								</RadioGroup>
							</div>

							<div className="space-y-4">
								<Label>Tone</Label>
								<RadioGroup
									value={config.tone}
									onValueChange={(value) => handleInputChange("tone", value)}
									className="grid grid-cols-2 sm:grid-cols-3 gap-4"
								>
									{voiceOptions.tone.map((option) => (
										<div key={option.value} className="flex items-center space-x-2">
											<RadioGroupItem value={option.value} id={`tone-${option.value}`} />
											<Label htmlFor={`tone-${option.value}`}>{option.label}</Label>
										</div>
									))}
								</RadioGroup>
							</div>

							<div className="pt-4">
								<Button variant="outline" className="w-full" onClick={playVoicePreview}>
									<Volume2 className="mr-2 h-4 w-4" />
									Preview Voice
								</Button>
								<p className="text-xs text-center text-muted-foreground mt-2">
									Will play: "Hello! Ready for adventure?"
								</p>
							</div>
						</div>
					</div>
				);

			case 7:
				return (
					<div className="space-y-6">
						<div className="text-center mb-6">
							<h2 className="text-2xl font-bold">Name & Preview</h2>
							<p className="text-muted-foreground mt-2">Choose a name for your companion and review your creation</p>
						</div>

						<div className="space-y-8">
							<div className="space-y-4">
								<Label>AI Suggested Names</Label>
								<div className="flex flex-wrap gap-2">
									{suggestedNames.map((name) => (
										<Badge
											key={name}
											variant="outline"
											className="cursor-pointer px-3 py-1 hover:bg-primary/20"
											onClick={() => handleInputChange("name", name)}
										>
											{name}
										</Badge>
									))}
								</div>
							</div>

							<div className="space-y-4">
								<Label htmlFor="name">Choose or edit name</Label>
								<Input
									id="name"
									placeholder="Enter a name for your companion"
									value={config.name}
									onChange={(e) => handleInputChange("name", e.target.value)}
								/>
							</div>

							<Card className="p-6">
								<div className="grid md:grid-cols-2 gap-8">
									<div className="bg-muted rounded-lg p-6 flex items-center justify-center">
										<div className="text-center">
											<div className="w-32 h-32 bg-primary/10 rounded-full mx-auto mb-4 flex items-center justify-center">
												<Sparkles className="h-10 w-10 text-primary/50" />
											</div>
											<p className="text-muted-foreground">Character preview will appear here</p>
										</div>
									</div>

									<div>
										<h3 className="text-xl font-bold mb-4">{config.name || "Your Companion"}</h3>
										<div className="space-y-3">
											<div>
												<span className="font-medium">Visual Style:</span>{" "}
												{config.visualStyle === "anime" ? "Anime / Stylized" : "Realistic / Relatable"}
											</div>
											<div>
												<span className="font-medium">Archetype:</span>{" "}
												{config.archetype &&
													archetypes[config.visualStyle]?.find((a) => a.value === config.archetype)?.label}
											</div>
											<div>
												<span className="font-medium">Top Traits:</span> {config.topTraits.join(", ")}
											</div>
											<div>
												<span className="font-medium">Voice:</span> {config.voiceModel}
											</div>
										</div>
									</div>
								</div>
							</Card>
						</div>
					</div>
				);

			default:
				return null;
		}
	};

	return (
		<div className="space-y-8">
			{/* Progress bar */}
			<div className="w-full bg-muted rounded-full h-2">
				<div
					className="bg-success-600 h-2 rounded-full transition-all"
					style={{ width: `${((step + 1) / 8) * 100}%` }}
				></div>
			</div>

			{/* Step indicator */}
			<div className="flex justify-between text-xs text-muted-foreground px-1">
				<span>Step {step + 1} of 8</span>
				<span>
					{
						[
							"Visual Style",
							"Archetype",
							"Personality",
							"Relationship",
							"World & Lore",
							"Appearance",
							"Voice",
							"Name & Preview",
						][step]
					}
				</span>
			</div>

			{/* Step content */}
			<AnimatePresence mode="wait">
				<motion.div
					key={step}
					initial="hidden"
					animate="visible"
					exit="exit"
					variants={pageVariants}
					transition={{ duration: 0.3 }}
				>
					{renderStep()}
				</motion.div>
			</AnimatePresence>

			{/* Navigation buttons */}
			<div className="flex justify-between pt-4">
				<Button variant="outline" onClick={handleBack} disabled={step === 0}>
					<ChevronLeft className="mr-2 h-4 w-4" />
					Back
				</Button>
				<Button onClick={handleNext} disabled={!isStepComplete()}>
					{step === 7 ? "Create My Companion" : "Next"}
					{step !== 7 && <ChevronRight className="ml-2 h-4 w-4" />}
				</Button>
			</div>
		</div>
	);
};

export default CharacterQuestionnaire;
