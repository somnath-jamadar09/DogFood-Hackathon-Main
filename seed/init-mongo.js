// seed/init-mongo.js - Dogfood 2026 Tournament Seed Data
const db = db.getSiblingDB('dogfood');

print("=== [SEED] Initializing Dogfood 2026 Tournament Fixtures ===");

// 1. Seed Event Configuration
const eventDoc = db.events.insertOne({
  name: "Hackathon Raptors 2026",
  status: "active",
  submissionDeadline: new Date(Date.now() + 24 * 3600 * 1000), // 24 hours from boot
  tracks: ["AI/ML", "Web3 & Blockchain", "FinTech", "HealthTech"],
  rubric: [
    { name: "Technical Execution", weight: 0.30, scaleMin: 1, scaleMax: 10 },
    { name: "Innovation & Originality", weight: 0.25, scaleMin: 1, scaleMax: 10 },
    { name: "Practical Impact", weight: 0.25, scaleMin: 1, scaleMax: 10 },
    { name: "Polish & Presentation", weight: 0.20, scaleMin: 1, scaleMax: 10 }
  ],
  createdAt: new Date(),
  updatedAt: new Date()
});

// 2. Seed Default Accounts
// Password for all seeded accounts is: "Raptor2026!" (Bcrypt hashed)
const defaultHash = "$2a$10$wE9l1T5vU6tZkYJmQZ7u1.Zg6C5J0R0J8Y4bV8h9X0l1Z2m3k4l5e";

// Create Organizer
const organizerId = db.users.insertOne({
  email: "organizer@raptors.local",
  passwordHash: defaultHash,
  fullName: "Chief Organizer Raptor",
  role: "organizer",
  judgeTracks: [],
  conflictsOfInterest: [],
  createdAt: new Date(),
  updatedAt: new Date()
}).insertedId;

// Create Track Judges
const judgeAi = db.users.insertOne({
  email: "judge.ai@raptors.local",
  passwordHash: defaultHash,
  fullName: "Dr. Elena Rostova (AI Lead)",
  role: "judge",
  judgeTracks: ["AI/ML"],
  conflictsOfInterest: [],
  createdAt: new Date(),
  updatedAt: new Date()
}).insertedId;

const judgeWeb3 = db.users.insertOne({
  email: "judge.web3@raptors.local",
  passwordHash: defaultHash,
  fullName: "Satoshi Vance (Web3 Architect)",
  role: "judge",
  judgeTracks: ["Web3 & Blockchain"],
  conflictsOfInterest: [],
  createdAt: new Date(),
  updatedAt: new Date()
}).insertedId;

const judgeFintech = db.users.insertOne({
  email: "judge.fintech@raptors.local",
  passwordHash: defaultHash,
  fullName: "Marcus Sterling (FinTech Director)",
  role: "judge",
  judgeTracks: ["FinTech"],
  conflictsOfInterest: [],
  createdAt: new Date(),
  updatedAt: new Date()
}).insertedId;

const judgeHealth = db.users.insertOne({
  email: "judge.health@raptors.local",
  passwordHash: defaultHash,
  fullName: "Dr. Clara Chen (HealthTech Lead)",
  role: "judge",
  judgeTracks: ["HealthTech"],
  conflictsOfInterest: [],
  createdAt: new Date(),
  updatedAt: new Date()
}).insertedId;

// Create Participant Team & Submission
const hacker = db.users.insertOne({
  email: "hacker@raptors.local",
  passwordHash: defaultHash,
  fullName: "Alex Rivera",
  role: "participant",
  createdAt: new Date(),
  updatedAt: new Date()
}).insertedId;

const team = db.teams.insertOne({
  name: "CyberDinos",
  joinCode: "RAPTOR",
  captainId: hacker,
  members: [hacker],
  track: "AI/ML",
  hasSubmitted: true,
  createdAt: new Date(),
  updatedAt: new Date()
}).insertedId;

db.users.updateOne({ _id: hacker }, { $set: { teamId: team } });

const submission = db.submissions.insertOne({
  teamId: team,
  title: "Neural Raptor",
  tagline: "Autonomous air-gapped machine learning submission evaluator",
  track: "AI/ML",
  repoUrl: "https://github.com/raptors/neural-raptor",
  demoUrl: "http://localhost:3000/demo",
  descriptionMarkdown: "### Neural Raptor\nAn enterprise-grade offline submission evaluation system.",
  thumbnailPath: "/uploads/default-thumbnail.webp",
  status: "submitted",
  publicVoteCount: 12,
  submittedAt: new Date(),
  createdAt: new Date(),
  updatedAt: new Date()
}).insertedId;

// Create initial assignment for judgeAi to Neural Raptor
db.judgeassignments.insertOne({
  judgeId: judgeAi,
  submissionId: submission,
  track: "AI/ML",
  status: "pending",
  createdAt: new Date(),
  updatedAt: new Date()
});

print("=== [SEED] Successfully populated mock users, teams, submissions and assignments! ===");
