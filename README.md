# AdversarialX

Interactive adversarial machine learning attack simulation platform. Visualize neural network vulnerabilities, perturbation effects, and defense mechanisms in real-time.

![React](https://img.shields.io/badge/React-18.2-61DAFB?style=flat-square&logo=react)
![Vite](https://img.shields.io/badge/Vite-5.0-646CFF?style=flat-square&logo=vite)
![D3.js](https://img.shields.io/badge/D3.js-7.8-F9A03C?style=flat-square&logo=d3.js)
![License](https://img.shields.io/badge/License-MIT-green?style=flat-square)

## Live Demo

🔗 **[View Live Demo](https://adversarial-x.vercel.app/)**

## Features

### Neural Network Visualization
- Interactive layer-by-layer network visualization
- Real-time node activation during attacks
- Connection weight perturbation display

### Attack Simulation
- **FGSM** - Fast Gradient Sign Method
- **PGD** - Projected Gradient Descent
- **C&W** - Carlini & Wagner L2 Attack
- **DeepFool** - Minimal Perturbation Attack

### Defense Analysis
- Adversarial training effectiveness
- Input preprocessing filters
- Defensive distillation
- Feature squeezing

### Real-time Metrics
- Model confidence degradation charts
- Attack success rate tracking
- Classification output probability distribution

## Architecture

```mermaid
graph TB
    subgraph Frontend
        Landing[Landing Page]
        Dashboard[Attack Dashboard]

        subgraph Visualizations
            NN[Neural Network D3]
            Charts[Recharts Analytics]
            Perturb[Perturbation Demo]
        end
    end

    Landing --> Dashboard
    Dashboard --> Visualizations
```

## Tech Stack

| Category | Technology |
|----------|------------|
| Framework | React 18 |
| Build Tool | Vite 5 |
| Styling | Tailwind CSS |
| Animations | Framer Motion |
| Network Viz | D3.js |
| Charts | Recharts |
| Deployment | GitHub Pages |

## Quick Start

```bash
# Clone repository
git clone https://github.com/ryanwelchtech/adversarial-x.git
cd adversarial-x

# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build
```

## Design

Built with Apple 2026-inspired liquid glass UI:
- Glassmorphism with backdrop blur
- Smooth gradient transitions
- Micro-interactions and hover states
- Dark mode optimized interface

## Author

**Ryan Welch** - Cloud & Systems Security Engineer

- Portfolio: [ryanwelchtech.com](https://ryanwelchtech.com)
- GitHub: [@ryanwelchtech](https://github.com/ryanwelchtech)
- LinkedIn: [Ryan Welch](https://linkedin.com/in/ryanwelchtech)

## License

MIT License
