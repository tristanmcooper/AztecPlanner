# AztecPlanner

> An intelligent academic planning assistant built for SDSU students, powered by AI and modern web technologies.

Created for **ACM SDSU Innovate 4 Hackathon 2025**, AztecPlanner revolutionizes course planning through AI-driven recommendations and intelligent degree audit analysis.

## Architecture

AztecPlanner features a cutting-edge full-stack architecture leveraging the latest in web and AI technologies:

### **Frontend: React + Vite**
Lightning-fast React application built with Vite for instant hot-module replacement and optimized production builds. Handles dynamic user interactions, degree audit parsing, and real-time semester planning with a responsive, intuitive interface. Styled with Tailwind CSS and featuring interactive data visualizations powered by Recharts.

### **Backend: FastAPI + Uvicorn**
High-performance async Python webserver powered by FastAPI and Uvicorn ASGI server, featuring:
- **Vector Database**: ChromaDB integration for semantic course search and intelligent recommendations
- **LLM Integration**: LiteLLM endpoints enabling multi-model AI assistance
- **Custom RAG Pipeline**: Retrieval-Augmented Generation system combining vector search with language models for context-aware academic advising

## Project Structure

```
AztecPlanner
├── front-end-webserver/     # React + Vite frontend application
│   ├── Smart degree audit parsing and requirement tracking
│   ├── Interactive semester planning interface
│   ├── AI-powered course recommendations
│   ├── Real-time course search and filtering
│   └── Tailwind + Recharts for data visualizations and responsive design
│
├── utils/                    # FastAPI backend server
│   ├── ChromaDB vector store for semantic search
│   ├── Course database management
│   ├── LLM integration layer with LiteLLM
│   └── Custom RAG implementation
│
├── scraper/                  # Data acquisition pipeline
│   ├── Beautiful Soup web scraper for SDSU course catalog
│   └── Selenium-powered RateMyProfessor data extraction
│
└── tests/                    # API testing suite
    └── Comprehensive endpoint validation notebooks
```



## Tech Stack

**Frontend**
- React 18 - Modern UI component library
- Vite - Next-generation frontend tooling
- Tailwind CSS - Utility-first CSS framework for rapid UI development
- Recharts - Composable charting library for data visualization

**Backend**
- Python 3.10 - Core backend language
- FastAPI - Modern, fast web framework
- Uvicorn - Lightning-fast ASGI server
- ChromaDB - AI-native vector database
- LiteLLM - Unified LLM API interface

**Data Collection**
- Beautiful Soup - HTML parsing and web scraping
- Selenium - Dynamic content extraction

## Getting Started

### Prerequisites
- Anaconda3 or Miniconda
- Node.js (v16 or higher)
- `.env` file with required API keys

### Installation

**1. Set up Python environment**
```bash
conda create -n aztecPlanner python=3.10
conda activate aztecPlanner
pip install -r requirements.txt
```

**2. Launch the backend server**
```bash
python -m py_compile utils/api_server.py
python -m uvicorn utils.api_server:app --reload --host 127.0.0.1 --port 8000
```

**3. Start the frontend development server** (in a separate terminal)
```bash
cd front-end-webserver
npm install
npm run dev
```

**Done!** Access the application at `http://localhost:5173`

## Features

- **Intelligent Degree Audit Parsing** - Automatically extracts and analyzes degree requirements
- **Smart Semester Planning** - AI-assisted course scheduling with prerequisite validation
- **Semantic Course Search** - Vector-based search powered by ChromaDB
- **AI Academic Advisor** - RAG-powered chatbot for personalized course recommendations
- **Professor Insights** - Integrated RateMyProfessor data for informed decision-making

---

<div align="center">
Built with love for SDSU students by the <i>Sudo Apt-get Win</i> Innovate 4 SDSU Hackathon Team
</div>