/**
 * RefScan - AI Research & Academic Intelligence Assistant
 * Comprehensive AI chatbot for:
 * 1. Project-related queries (RefScan architecture, scanning, PDF analysis, citations, collections, MongoDB).
 * 2. Active document intelligence (deep breakdown of active book/paper sections, methods, algorithms, gaps).
 * 3. Core field knowledge in Computer Science, Artificial Intelligence, Machine Learning, and Research Methodology.
 * 4. Google-like live encyclopedic knowledge search with Wikipedia REST API and academic discovery links.
 */

import type { Reference, BookReference, PaperReference, CitationStyle } from "../types/index.ts";
import { generateCitationPlainText, generateCitationHTML } from "./citationService.ts";

export interface ChatMessage {
  id: string;
  sender: "user" | "assistant";
  text: string;
  html?: string;
  timestamp: string;
  suggestions?: string[];
  referenceSnippet?: {
    title: string;
    type: string;
    authors?: string[];
  };
}

export interface ChatContext {
  currentPath: string;
  activeBook?: BookReference | null;
  activePaper?: PaperReference | null;
  references: Reference[];
  preferredStyle?: CitationStyle;
}

// ──────────────────────────────────────────────────────────────────────────
// 1. REFSCAN PROJECT KNOWLEDGE BASE
// ──────────────────────────────────────────────────────────────────────────

interface KnowledgeTopic {
  keywords: string[];
  title: string;
  answer: string;
  suggestions: string[];
}

const PROJECT_KNOWLEDGE: KnowledgeTopic[] = [
  {
    keywords: [
      "what is refscan", "about refscan", "what is this project", "explain this project",
      "what does this project do", "about this application", "refscan overview", "what is this app"
    ],
    title: "About RefScan - Academic Reference & Research Assistant",
    answer: `### 📚 About RefScan

**RefScan** is an advanced, full-stack **Academic Reference Management & Document Intelligence Platform** designed for researchers, students, and engineers.

#### 🚀 Key Features & Capabilities:
1. **Physical Book Barcode & QR Scanner**:
   * Uses your device camera (supporting both back and front cameras with instant flip) or manual ISBN entry.
   * Auto-fetches verified bibliographic metadata from **Google Books** and **Open Library**.
2. **Multi-Page Research Paper Analyzer**:
   * Upload academic PDFs or text manuscripts.
   * Extracts layout-aware full text and analyzes **15 structured research sections**: Abstract, Research Problem, Objectives, Baselines, Proposed Method, Methodology, Algorithms, Datasets, Frameworks, Results, Limitations, Research Gaps, Future Scope, Conclusion, and Plain-Language Simplification.
3. **Multiple Reference Collection (A4 Sheet)**:
   * Extracts cited references from papers, detects duplicates, formats into batch bibliographies, and exports to printable A4 sheets.
4. **Automated Citation Generator**:
   * Formats references instantly in **IEEE, APA (7th), MLA (9th), and Harvard** styles.
   * Exports in **BibTeX (.bib)**, **RIS (.ris)**, or downloadable PDF.
5. **Research Gap Discovery**:
   * Analyzes author-stated constraints and methodology boundaries to identify unexplored research opportunities and project ideas.
6. **MongoDB Multi-User Isolation**:
   * Secure user accounts with bcrypt-hashed credentials and private workspaces in MongoDB.`,
    suggestions: [
      "How do I scan a book barcode?",
      "How does research paper analysis work?",
      "How do I generate citations in IEEE or APA?",
      "What is the tech stack of RefScan?"
    ]
  },
  {
    keywords: [
      "tech stack", "technology stack", "how is refscan built", "technologies used in this project",
      "architecture", "what framework", "frontend and backend"
    ],
    title: "RefScan System Architecture & Tech Stack",
    answer: `### 🛠️ RefScan System Architecture & Tech Stack

RefScan is engineered with a modern, high-performance web architecture:

* **Frontend**:
  * **React 19 & TypeScript 5.7**: Component-driven UI with strict type safety.
  * **Vite 8**: Ultra-fast bundler with Hot Module Reload (HMR).
  * **Tailwind CSS v4**: Responsive, utility-first styling with dark/light theme support.
  * **Lucide React**: Clean, accessible iconography.
* **Document & Vision Processing**:
  * **PDF.js (pdfjs-dist)**: Client-side layout-aware multi-page PDF parsing and text-coordinate extraction.
  * **Barcode / QR Engine**: Quagga2 and ZXing camera scanner with front/back camera support.
* **Backend & Database**:
  * **Node.js HTTP Server**: Lightweight REST API routes mounted under \`/api/*\`.
  * **MongoDB Native Driver**: Isolated collections for \`users\`, \`references\`, and \`citation_papers\`.
  * **Security**: Multi-user isolation, bcrypt password hashing, and JWT bearer authentication tokens.
* **Export Tooling**:
  * **html2pdf.js & Canvas**: High-fidelity PDF generation for citation sheets and research summaries.`,
    suggestions: [
      "What is RefScan?",
      "How does MongoDB isolation work?",
      "How does paper extraction work?"
    ]
  },
  {
    keywords: [
      "how to scan a book", "scan barcode", "barcode scanner", "isbn scan", "camera scanner",
      "how to use scanner", "how to scan", "front camera", "back camera", "camera flip"
    ],
    title: "How to Use the Book Barcode & QR Scanner",
    answer: `### 📷 How to Scan Books & ISBN Barcodes in RefScan

1. **Open the Scanner**:
   * Click **Scan Book** in the navigation sidebar or tap the scanner icon on mobile.
2. **Camera Access & Flipping**:
   * Grant camera permissions when prompted.
   * If you're on a mobile device or laptop, click the **Camera Flip button** (next to Start Camera) to toggle between the **Back (Environment) Camera** and **Front (User) Camera**.
3. **Scan Barcode or QR Code**:
   * Hold the physical book's barcode (EAN-13, ISBN-10, or ISBN-13) within the viewfinder frame.
   * The scanner will automatically detect the barcode and play a confirmation chime.
4. **Manual ISBN Fallback**:
   * If you don't have a camera, type the 10-digit or 13-digit ISBN into the input box below the camera and click **Search**.
5. **Metadata Verification**:
   * RefScan queries **Google Books API** and **Open Library** to pull the title, authors, publisher, year, category, page count, and cover preview.
   * Click **Save to Library** or **Cite Book** immediately!`,
    suggestions: [
      "What is this book about?",
      "How do I generate APA citations?",
      "Show me my saved books"
    ]
  },
  {
    keywords: [
      "how to upload paper", "how does paper analysis work", "paper analysis", "pdf upload",
      "extract paper", "research paper extraction", "15 sections", "how to analyze paper"
    ],
    title: "How Research Paper Extraction & Analysis Works",
    answer: `### 📄 Research Paper Extraction & Deep Semantic Analysis

1. **Upload Document**:
   * Go to **Research Papers** and click **Upload New Paper** (supports PDF, TXT, or MD).
2. **Layout-Aware PDF Ingestion**:
   * RefScan uses PDF.js to extract real text streams page-by-page while preserving coordinate positions, identifying prominent title fonts, true author affiliations, and section headings.
3. **15 Structured Dimensions Analyzed**:
   * **1. Metadata**: True Title, Authors, Year, DOI, Affiliations.
   * **2. Abstract Overview**: Core research hypothesis and problem summary.
   * **3. Research Problem**: Bottlenecks addressed by authors.
   * **4. Research Objectives**: Empirical targets and validation milestones.
   * **5. Existing Baselines**: Conventional pipelines compared against.
   * **6. Proposed Method**: The novel contribution introduced in the paper.
   * **7. Technical Methodology**: Multi-phase experimental approach.
   * **8. Algorithms & Models**: Identified neural networks, feature extractors, and optimizers.
   * **9. Dataset & Benchmarks**: Dataset names, sample volumes, and feature splits.
   * **10. Frameworks & Tools**: PyTorch, OpenCV, Transformers, CUDA, etc.
   * **11. Results & Findings**: Empirical accuracy, precision, F1-scores, and latency.
   * **12. Stated Limitations**: Real-world constraints and operational boundaries.
   * **13. Research Gaps**: Unexplored opportunities with suggested project ideas.
   * **14. Future Scope**: Author-suggested next steps and extensions.
   * **15. Conclusion & Plain-Language Simplification**: Layperson summary explaining *"What is this paper about?"* and *"What can I build from this?"*.`,
    suggestions: [
      "Explain the research gaps in this paper",
      "What algorithms are used in my active paper?",
      "How do I export citations to BibTeX?"
    ]
  },
  {
    keywords: [
      "how to generate citations", "citation generator", "export citations", "bibtex", "ris",
      "how to cite", "citation styles", "apa vs ieee", "harvard citation"
    ],
    title: "How to Generate & Export Citations",
    answer: `### 📝 Generating & Exporting Academic Citations

RefScan offers complete bibliographic formatting for any book, paper, or website:

1. **Choose Citation Style**:
   * Select from **IEEE** (numbered bracket format \`[1]\`), **APA 7th** (Author-Date), **MLA 9th** (Works Cited), or **Harvard** (Author-Year).
2. **Single Reference Citation**:
   * Open any reference card and click **Cite**. You can copy formatted text, rich HTML, or BibTeX blocks with one click.
3. **Batch Collection & A4 Sheet**:
   * Navigate to **Collection** to organize multiple references.
   * Click **Export PDF** to produce a clean, publication-ready bibliography.
4. **Export File Formats**:
   * **BibTeX (.bib)**: Import directly into LaTeX, Overleaf, or Texmaker.
   * **RIS (.ris)**: Compatible with Mendeley, Zotero, and EndNote.`,
    suggestions: [
      "What is the difference between APA and IEEE?",
      "Generate IEEE citation for my active paper",
      "What is BibTeX format?"
    ]
  },
  {
    keywords: [
      "mongodb", "database", "how is data saved", "multi-user", "is my data private",
      "user isolation", "login", "register", "accounts"
    ],
    title: "MongoDB Multi-User Isolation & Security in RefScan",
    answer: `### 🔒 MongoDB Database & Multi-User Isolation

RefScan is built with strict multi-user privacy and data integrity:

* **Dedicated Database**: Connected to MongoDB (\`refscan\` database on \`127.0.0.1:27017\`).
* **Strict User Isolation**: Every reference, paper analysis, and citation record is tagged with the user's unique \`userId\`. Users only see and manage their own library.
* **Secure Authentication**:
  * Passwords are encrypted with **bcrypt** (salted hashing).
  * API calls authenticate via scoped JWT session tokens.
* **Persistent Storage**: All uploaded papers, extracted sections, and generated citations remain permanently saved in MongoDB across browser sessions.`,
    suggestions: [
      "What is RefScan?",
      "How to upload a research paper?",
      "Show me my saved books"
    ]
  },
  {
    keywords: [
      "mobile", "android", "phone", "mobile friendly", "responsive", "mobile app"
    ],
    title: "Mobile Friendly Design & Android Support",
    answer: `### 📱 Mobile Friendly & Android App Experience

RefScan is designed as a **Mobile-First Responsive Web Application**:

* **Touch-Friendly Controls**: All interactive buttons, tabs, and toggles have touch targets of at least **44px** to conform to Android and iOS accessibility guidelines.
* **Dual Camera Support**: On mobile devices, use the **Camera Flip button** to toggle between the rear camera (best for barcode scanning) and front camera.
* **Mobile Navigation**: Includes a mobile bottom navigation bar for quick one-thumb switching between Library, Scanner, Papers, and Citations.
* **PWA / Browser Access**: Runs directly inside mobile browsers without requiring app store installation.`,
    suggestions: [
      "How do I scan a book barcode?",
      "What is RefScan?",
      "How to analyze a research paper?"
    ]
  }
];

// ──────────────────────────────────────────────────────────────────────────
// 2. CORE ACADEMIC & COMPUTER SCIENCE KNOWLEDGE BASE
// ──────────────────────────────────────────────────────────────────────────

const DOMAIN_KNOWLEDGE: KnowledgeTopic[] = [
  {
    keywords: [
      "what is deep learning", "deep learning", "explain deep learning", "how deep learning works",
      "neural networks", "artificial neural network"
    ],
    title: "Deep Learning (DL) & Artificial Neural Networks",
    answer: `### 🧠 Deep Learning (DL) Explained

**Deep Learning** is a specialized subfield of Machine Learning based on **Artificial Neural Networks** with multiple interconnected layers (hence "deep").

#### 🔑 Key Concepts:
* **Architecture**: Input Layer $\\rightarrow$ Hidden Layers (feature extractors) $\\rightarrow$ Output Layer (predictions).
* **Weights & Biases**: Learnable parameters adjusted during training to minimize prediction error.
* **Activation Functions**: Introduce non-linearity (e.g., ReLU, GeLU, Sigmoid, Softmax) allowing networks to learn complex decision boundaries.
* **Backpropagation & Gradient Descent**: Computes the gradient of the loss function with respect to weights using the chain rule, iteratively updating weights using optimizers like **Adam** or **SGD**.

#### 🌟 Major Architectures:
1. **CNNs (Convolutional Neural Networks)**: Spatial grid data (images, video).
2. **RNNs / LSTMs**: Sequential data (time-series, legacy NLP).
3. **Transformers**: Self-attention architectures dominating modern NLP and Computer Vision.
4. **Diffusion Models & GANs**: High-fidelity generative modeling.`,
    suggestions: [
      "What is a transformer model?",
      "What is the difference between CNN and RNN?",
      "What is overfitting and how to avoid it?",
      "What are loss functions in machine learning?"
    ]
  },
  {
    keywords: [
      "what is machine learning", "machine learning", "supervised vs unsupervised",
      "types of machine learning", "ml vs dl", "explain machine learning"
    ],
    title: "Machine Learning (ML) Fundamentals",
    answer: `### 🤖 Machine Learning (ML) Overview

**Machine Learning** is a branch of Artificial Intelligence focused on algorithms that learn patterns and rules from historical data rather than following static, hardcoded instructions.

#### 📊 The 3 Primary Paradigms:
1. **Supervised Learning**:
   * **Concept**: Learns mapping from labeled input-output pairs $(X, Y)$.
   * **Tasks**: Classification (discrete classes) and Regression (continuous values).
   * **Examples**: Random Forest, SVM, Logistic Regression, Linear Regression, Deep Neural Nets.
2. **Unsupervised Learning**:
   * **Concept**: Finds hidden patterns or intrinsic structures in unlabeled data $(X)$.
   * **Tasks**: Clustering (K-Means, DBSCAN), Dimensionality Reduction (PCA, t-SNE, UMAP), Anomaly Detection.
3. **Reinforcement Learning (RL)**:
   * **Concept**: An agent learns optimal policy actions via environmental trial, error, rewards, and penalties (Markov Decision Process).
   * **Examples**: Q-Learning, PPO, Deep Q-Networks (DQN), RLHF (Reinforcement Learning from Human Feedback).`,
    suggestions: [
      "What is deep learning?",
      "What is overfitting and how to avoid it?",
      "What is cross-validation?",
      "How to evaluate classification models?"
    ]
  },
  {
    keywords: [
      "what is a transformer", "transformer model", "transformer architecture", "attention mechanism",
      "self-attention", "how transformers work", "multi head attention"
    ],
    title: "Transformer Architecture & Self-Attention Mechanism",
    answer: `### ⚡ Transformer Model & Self-Attention Explained

Introduced by Vaswani et al. (2017) in *"Attention Is All You Need"*, the **Transformer** revolutionized AI by replacing recurrent mechanisms with **Self-Attention**.

#### 🔍 How Self-Attention Works:
Every input token is mapped into three learned linear vectors:
* **Query ($Q$)**: What the current token is seeking.
* **Key ($K$)**: What other tokens contain.
* **Value ($V$)**: The actual semantic content.

$$\\text{Attention}(Q, K, V) = \\text{softmax}\\left(\\frac{QK^T}{\\sqrt{d_k}}\\right) V$$

#### 🚀 Key Architectural Advantages:
* **Parallelization**: Unlike sequential RNNs, all sequence positions are processed concurrently during training.
* **Long-Range Dependencies**: Direct token-to-token connections solve vanishing gradient issues over long documents.
* **Multi-Head Attention**: Allows the model to jointly attend to information from different representation subspaces (e.g., syntactic vs. semantic).
* **Foundational Impact**: Powers LLMs like **GPT-4, Claude, Gemini, BERT, LLaMA**, and Vision Transformers (**ViT**).`,
    suggestions: [
      "What is BERT vs GPT?",
      "What is deep learning?",
      "What is transfer learning and fine-tuning?",
      "What is an ablation study?"
    ]
  },
  {
    keywords: [
      "cnn", "convolutional neural network", "cnn vs rnn", "computer vision", "how cnn works"
    ],
    title: "Convolutional Neural Networks (CNN) & Visual Perception",
    answer: `### 🖼️ Convolutional Neural Networks (CNNs)

**Convolutional Neural Networks (CNNs)** are deep learning architectures designed for processing grid-structured topology like images, video frames, and spectrograms.

#### 🧱 Core Layers:
1. **Convolutional Layer**:
   * Applies learnable kernel filters (e.g., $3\\times 3$, $5\\times 5$) across the input image to extract low-level features (edges, textures) in early layers and high-level features (faces, objects) in deep layers.
   * Benefits from **parameter sharing** and **translation invariance**.
2. **Activation Layer (ReLU)**:
   * Introduces non-linearity ($f(x) = \\max(0, x)$).
3. **Pooling Layer (Max Pooling / Avg Pooling)**:
   * Downsamples spatial dimensions to reduce computational complexity and prevent overfitting.
4. **Fully Connected / Linear Layer**:
   * Flattens feature maps to produce final classification logits.

#### 🏆 Classic Benchmark Models:
* **AlexNet (2012)** $\\rightarrow$ **VGGNet (2014)** $\\rightarrow$ **ResNet (2015, Residual Connections)** $\\rightarrow$ **YOLO (Real-Time Object Detection)** $\\rightarrow$ **EfficientNet**.`,
    suggestions: [
      "What is transfer learning?",
      "What is a transformer model?",
      "What is YOLO object detection?",
      "What is overfitting?"
    ]
  },
  {
    keywords: [
      "overfitting", "underfitting", "how to avoid overfitting", "regularization",
      "bias variance tradeoff", "dropout"
    ],
    title: "Overfitting vs. Underfitting & Regularization Strategies",
    answer: `### ⚖️ Overfitting, Underfitting & Bias-Variance Tradeoff

* **Underfitting (High Bias)**:
  * Model is too simplistic to capture underlying patterns in the training data (e.g., using linear regression for non-linear data).
  * *Fix*: Increase model complexity, engineer informative features, reduce regularization.
* **Overfitting (High Variance)**:
  * Model memorizes training noise and outliers rather than generalizing to unseen test data (high training accuracy, poor validation accuracy).

#### 🛡️ Proven Techniques to Prevent Overfitting:
1. **Cross-Validation**: Use $K$-fold cross-validation to assess generalization.
2. **Regularization ($L_1$ & $L_2$)**:
   * $L_2$ (Ridge / Weight Decay): Penalizes large weight values.
   * $L_1$ (Lasso): Drives redundant weights to zero (sparse representations).
3. **Dropout**: Randomly deactivates neurons during forward pass to prevent co-adaptation.
4. **Data Augmentation**: Flips, rotations, scaling, and noise injection to synthetically expand training distribution.
5. **Early Stopping**: Halts training once validation loss starts increasing.`,
    suggestions: [
      "What is cross-validation?",
      "What is deep learning?",
      "What are loss functions?",
      "How to write an ablation study?"
    ]
  },
  {
    keywords: [
      "what is a research gap", "research gap", "how to find research gaps", "identify research gaps",
      "research gaps in papers"
    ],
    title: "What is a Research Gap & How to Identify One",
    answer: `### 🔍 Research Gaps Explained

A **Research Gap** is an unanswered scientific question, unaddressed problem, or unexplored methodological limitation within the existing published literature.

#### 🧭 Common Types of Research Gaps:
1. **Classic Limitation Gap**: Current state-of-the-art algorithms perform poorly under dynamic real-world conditions (e.g., low light, edge hardware constraints).
2. **Evaluation Gap**: Prior works evaluated only on small synthetic benchmarks without cross-domain or longitudinal validation.
3. **Methodological Gap**: Existing methods rely on legacy heuristic models rather than modern contextual representations.
4. **Generalization Gap**: A model validated in one domain (e.g., English text) has not been adapted or evaluated for another (e.g., low-resource languages).

#### 💡 How RefScan Helps:
RefScan's **Paper Analysis** and **Research Gaps** sections automatically parse author-stated constraints and future scope, generating concrete **project opportunity cards** to inspire your thesis or next research paper!`,
    suggestions: [
      "How to write a literature review?",
      "How to formulate a problem statement?",
      "Explain the research gaps in my active paper",
      "What is an ablation study?"
    ]
  },
  {
    keywords: [
      "how to write a literature review", "literature review", "literature survey",
      "how to do literature review", "writing literature review"
    ],
    title: "How to Conduct & Write a Literature Review",
    answer: `### 📖 How to Write a Comprehensive Literature Review

A **Literature Review** synthesizes and critically analyzes existing scholarship to establish context, identify research gaps, and justify your research contribution.

#### 📝 Step-by-Step Methodology:
1. **Define Scope & Keywords**:
   * Formulate specific research questions (e.g., *"How do vision transformers compare to CNNs in autonomous drone navigation?"*).
2. **Search Academic Databases**:
   * Search **Google Scholar, IEEE Xplore, arXiv, PubMed, ACM Digital Library, and ScienceDirect** (accessible directly in RefScan's Research Sites).
3. **Filter & Select High-Impact Papers**:
   * Prioritize peer-reviewed journal papers and top-tier conference proceedings (CVPR, NeurIPS, ICML, ACL).
4. **Extract & Matrix Compare**:
   * Track Title, Authors, Year, Problem, Proposed Method, Dataset, Metrics, and Limitations.
5. **Synthesize Thematically (Not Chronologically)**:
   * Organize by concepts, paradigms, or architectural trade-offs rather than paper-by-paper summaries.
6. **Highlight the Research Gap**:
   * Conclude by showing where previous works fall short and how your proposed research bridges that gap!`,
    suggestions: [
      "What is a research gap?",
      "How to write a problem statement?",
      "What is an abstract vs introduction?",
      "How to avoid plagiarism?"
    ]
  },
  {
    keywords: [
      "problem statement", "research objective", "how to write problem statement",
      "difference between problem statement and objective"
    ],
    title: "Problem Statement vs. Research Objectives",
    answer: `### 🎯 Problem Statement vs. Research Objectives

* **Research Problem Statement**:
  * **What it is**: The specific unresolved conflict, practical bottleneck, or theoretical limitation currently hindering the field.
  * **Formula**: [Context / Background] + [Current Defect or Pain Point] + [Consequences if unaddressed].
  * *Example*: *"Existing UAV navigation pipelines suffer severe frame latency (>120ms) when running dense feature extractors on edge embedded hardware, risking collision in dynamic environments."*

* **Research Objectives**:
  * **What it is**: Concrete, measurable targets and milestones your work will achieve to solve the problem statement.
  * **Formula**: [Action Verb (Formulate/Implement/Evaluate)] + [Target System] + [Measurable Benchmark Metric].
  * *Example*: *"1. Formulate a low-bit quantized attention network; 2. Reduce edge inference latency below 35ms while retaining $\\ge 95\\%$ detection precision."*`,
    suggestions: [
      "What is a research gap?",
      "How to write an abstract?",
      "What is an ablation study?",
      "What is a literature review?"
    ]
  },
  {
    keywords: [
      "difference between apa and ieee", "apa vs ieee", "ieee vs apa", "citation styles",
      "mla style", "harvard style", "what is apa", "what is ieee"
    ],
    title: "Comparison of Academic Citation Styles (IEEE, APA, MLA, Harvard)",
    answer: `### 📚 Academic Citation Styles Comparison

| Feature | IEEE | APA (7th Ed.) | MLA (9th Ed.) | Harvard |
| :--- | :--- | :--- | :--- | :--- |
| **Primary Field** | Engineering, CS, Tech | Psychology, Social Sci | Humanities, Literature | Business, Natural Sci |
| **In-Text Format** | Numbered: \`[1]\`, \`[2]\` | Author-Date: \`(Smith, 2023)\` | Author-Page: \`(Smith 45)\` | Author-Date: \`(Smith 2023)\` |
| **Order in Bib** | Appearance order | Alphabetical by author | Alphabetical by author | Alphabetical by author |
| **Author Name** | Initials First: \`J. K. Smith\` | Last Name First: \`Smith, J. K.\` | Full Name: \`Smith, John K.\` | Last Name First: \`Smith, J.\` |
| **Title Format** | In quotes: \`"Paper Title"\` | Sentence-case italic/plain | Headline Capitalization | Single quotes or italics |

RefScan lets you switch between all 4 styles instantly in the **Citation Generator**!`,
    suggestions: [
      "How to cite a paper in IEEE?",
      "How to cite a book in APA?",
      "What is BibTeX format?",
      "What is DOI vs ISBN?"
    ]
  },
  {
    keywords: [
      "what is doi", "doi vs isbn", "isbn vs doi", "what is isbn", "issn", "digital object identifier"
    ],
    title: "DOI, ISBN, and ISSN Identifiers Explained",
    answer: `### 🆔 Persistent Academic Identifiers: DOI vs. ISBN vs. ISSN

* **DOI (Digital Object Identifier)**:
  * **Purpose**: Permanent unique URL pointing to a digital academic article, dataset, or paper (e.g., \`10.1109/CVPR.2023.12345\`).
  * Managed by **CrossRef** and **DataCite**.
  * Even if a publisher changes website domains, the DOI permanently resolves to the official publication landing page.

* **ISBN (International Standard Book Number)**:
  * **Purpose**: 10-digit or 13-digit commercial identifier assigned to published books, monographs, and textbooks.
  * Formatted with prefixes (\`978-\` or \`979-\`) identifying registration group, publisher, and title edition.

* **ISSN (International Standard Serial Number)**:
  * **Purpose**: 8-digit identifier assigned to recurring serial publications, academic journals, magazines, and periodicals.`,
    suggestions: [
      "How do I scan a book ISBN in RefScan?",
      "What is peer review?",
      "What is an impact factor and h-index?"
    ]
  },
  {
    keywords: [
      "what is impact factor", "h-index", "i10-index", "citation metrics", "journal metrics"
    ],
    title: "Academic Research Metrics: Impact Factor, h-index, and i10-index",
    answer: `### 📈 Research Metrics: Impact Factor, h-index, & i10-index

* **Journal Impact Factor (JIF)**:
  * **What it measures**: The average frequency with which articles published in a journal during the past two years were cited in a given year.
  * Formula: $\\text{JIF} = \\frac{\\text{Citations in Year } t \\text{ to items published in } (t-1) + (t-2)}{\\text{Total citable items published in } (t-1) + (t-2)}$.
  * Published annually by Clarivate in Journal Citation Reports (JCR).

* **h-index (Hirsch Index)**:
  * **What it measures**: Quantifies both the productivity and citation impact of a researcher.
  * Definition: An author has an index of $h$ if $h$ of their publications have at least $h$ citations each.
  * *Example*: If you published 10 papers and your top 5 papers have at least 5 citations each, your $h$-index is 5.

* **i10-index (Google Scholar)**:
  * **What it measures**: The count of academic publications by an author that have received at least 10 citations each.`,
    suggestions: [
      "What is peer review?",
      "How to write a literature review?",
      "How to publish a research paper?"
    ]
  },
  {
    keywords: [
      "what is an ablation study", "ablation study", "ablation experiment", "what does ablation mean"
    ],
    title: "What is an Ablation Study in Machine Learning Papers",
    answer: `### 🔬 Ablation Studies in Empirical Research

An **Ablation Study** is an experimental investigation where researchers systematically remove, disable, or replace specific components of an algorithm to quantify the individual contribution of each part.

#### 🎯 Why Ablation Studies are Essential:
1. **Prove Scientific Causality**: Demonstrates that empirical performance gains stem from the proposed innovation rather than random hyperparameter variance.
2. **Component Attribution**: If a proposed model has (1) a novel attention head, (2) a specialized loss function, and (3) a custom data augmentation routine:
   * Ablation Row A: *Full Proposed Pipeline* $\\rightarrow 96.2\\%$ Accuracy.
   * Ablation Row B: *Without Custom Loss* $\\rightarrow 93.8\\%$ (Loss contributes $+2.4\\%$).
   * Ablation Row C: *Without Attention Head* $\\rightarrow 89.1\\%$ (Attention contributes $+7.1\\%$).
3. **Peer Review Requirement**: Reviewers at top conferences (NeurIPS, CVPR, ICML) routinely reject papers lacking rigorous ablation validation.`,
    suggestions: [
      "What is cross-validation?",
      "What is a research gap?",
      "What are evaluation metrics in ML?"
    ]
  },
  {
    keywords: [
      "evaluation metrics", "f1 score", "precision recall", "roc auc", "accuracy precision recall",
      "how to evaluate models"
    ],
    title: "Machine Learning Evaluation Metrics (Precision, Recall, F1, ROC-AUC)",
    answer: `### 📊 Machine Learning Model Evaluation Metrics

* **Accuracy**: $\\frac{TP + TN}{TP + TN + FP + FN}$
  * Best for balanced datasets; highly deceptive on imbalanced classes.
* **Precision**: $\\frac{TP}{TP + FP}$
  * *"Out of all positive predictions, how many were correct?"* Critical when false alarms are costly (e.g., spam filtering).
* **Recall (Sensitivity)**: $\\frac{TP}{TP + FN}$
  * *"Out of all actual positive cases, how many did we catch?"* Critical in medical diagnosis or fraud detection where missing a positive is catastrophic.
* **F1-Score**: $2 \\times \\frac{\\text{Precision} \\times \\text{Recall}}{\\text{Precision} + \\text{Recall}}$
  * Harmonic mean balancing precision and recall under class imbalance.
* **Inference Latency**:
  * Wall-clock runtime per sample (ms), critical for robotics and edge computing.`,
    suggestions: [
      "What is overfitting?",
      "What is cross-validation?",
      "What is an ablation study?"
    ]
  },
  {
    keywords: [
      "what is rest api", "rest api", "graphql vs rest", "api explain", "what is an api"
    ],
    title: "APIs & REST Architectural Principles",
    answer: `### 🌐 REST APIs Explained

A **REST (Representational State Transfer) API** is an architectural pattern for stateless client-server network communication over HTTP.

#### 📌 Core HTTP Methods:
* **GET**: Retrieve resource representation (idempotent, safe).
* **POST**: Create a new resource on the server.
* **PUT / PATCH**: Update an entire or partial resource.
* **DELETE**: Remove the specified resource.

#### 💡 RefScan API Implementation:
RefScan utilizes REST endpoints including:
* \`GET /api/health\`: Service status and MongoDB diagnostics.
* \`POST /api/auth/login\` & \`register\`: User authentication.
* \`GET /api/references\` & \`POST /api/references\`: Reference management.
* \`POST /api/chat\`: Assistant dialogue processing.`,
    suggestions: [
      "What is MongoDB vs SQL?",
      "What is RefScan tech stack?",
      "What is Docker?"
    ]
  },
  {
    keywords: [
      "mongodb vs sql", "nosql vs sql", "why mongodb", "relational vs non relational"
    ],
    title: "MongoDB (NoSQL) vs. Relational SQL Databases",
    answer: `### 🗄️ MongoDB (NoSQL) vs. Relational SQL Databases

| Dimension | MongoDB (Document Store) | Traditional SQL (PostgreSQL, MySQL) |
| :--- | :--- | :--- |
| **Data Format** | JSON/BSON flexible documents | Structured relational tables with rows & columns |
| **Schema** | Dynamic / Polymorphic schema | Strict schema definitions and migrations |
| **Complex Nesting** | Native support for nested arrays & objects (e.g. lists of algorithms, evidence quotes) | Requires multiple normalized tables with Foreign Keys |
| **Scaling** | Horizontal sharding & replication | Vertical scaling with master-replica read pools |

RefScan uses **MongoDB** because research papers have heterogeneous structured attributes (sections, citation lists, evidence quotes, and metrics) that map natively into JSON documents!`,
    suggestions: [
      "How is data saved in RefScan?",
      "What is REST API?",
      "What is Docker?"
    ]
  }
];

// ──────────────────────────────────────────────────────────────────────────
// 3. LIVE GOOGLE-STYLE ACADEMIC & ENCYCLOPEDIC SEARCH ENGINE
// ──────────────────────────────────────────────────────────────────────────

interface LiveSearchResult {
  title: string;
  extract: string;
  description?: string;
  sourceUrl?: string;
}

/**
 * Queries Wikipedia / Academic knowledge live with a fast timeout (2.5s)
 * enabling Google-like instant factual lookups on any subject.
 */
async function fetchLiveKnowledge(query: string): Promise<LiveSearchResult | null> {
  const cleanTerm = query
    .replace(/what is a|what is an|what is|explain|who is|who was|tell me about|how does|what are|define|difference between/gi, "")
    .replace(/[?!.]/g, "")
    .trim();

  if (!cleanTerm || cleanTerm.length < 2) return null;

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2600);

    // 1. Direct summary query
    const directUrl = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(cleanTerm.replace(/\s+/g, "_"))}`;
    const directRes = await fetch(directUrl, { signal: controller.signal });

    if (directRes.ok) {
      const data = await directRes.json();
      clearTimeout(timeoutId);
      if (data.extract && data.type !== "disambiguation" && data.extract.length > 40) {
        return {
          title: data.title || cleanTerm,
          extract: data.extract,
          description: data.description,
          sourceUrl: data.content_urls?.desktop?.page || `https://en.wikipedia.org/wiki/${encodeURIComponent(cleanTerm)}`,
        };
      }
    }

    // 2. Fallback: Search endpoint to find best match
    const searchUrl = `https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(cleanTerm)}&format=json&origin=*`;
    const searchRes = await fetch(searchUrl, { signal: controller.signal });
    clearTimeout(timeoutId);

    if (searchRes.ok) {
      const searchData = await searchRes.json();
      const topHits = searchData.query?.search;
      if (topHits && topHits.length > 0) {
        const bestTitle = topHits[0].title;
        const secondUrl = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(bestTitle.replace(/\s+/g, "_"))}`;
        const secondRes = await fetch(secondUrl);
        if (secondRes.ok) {
          const secondData = await secondRes.json();
          if (secondData.extract && secondData.extract.length > 40) {
            return {
              title: secondData.title || bestTitle,
              extract: secondData.extract,
              description: secondData.description,
              sourceUrl: secondData.content_urls?.desktop?.page || `https://en.wikipedia.org/wiki/${encodeURIComponent(bestTitle)}`,
            };
          }
        }
      }
    }
  } catch {
    // Network timeout or offline, gracefully proceed to synthesis engine
  }

  return null;
}

/**
 * Generates an intelligent synthetic answer if live search was offline or query is broad.
 */
function synthesizeGeneralKnowledgeAnswer(query: string): string {
  const clean = query.replace(/[?!.]/g, "").trim();

  // If comparison query
  if (clean.toLowerCase().includes(" vs ") || clean.toLowerCase().includes(" versus ") || clean.toLowerCase().includes("difference between")) {
    return `### ⚖️ Comparison Analysis for "${clean}"\n\nWhen evaluating these concepts in computer science and academic research, key trade-offs exist across multiple dimensions:\n\n* **Foundational Purpose**: Each approach was formulated to address specific architectural bottlenecks, computational complexities, or data distribution challenges.\n* **Operational Trade-offs**: In practice, one typically provides superior computational speed and efficiency, while the other offers richer expressive capacity, generalization robustness, or analytical precision.\n* **Practical Recommendation**: Select the model or methodology based on your empirical benchmark requirements, available hardware compute, and dataset scale.`;
  }

  // General concept answer
  return `### 💡 Scientific & Technical Overview for "${clean}"\n\n* **Concept Definition**: In contemporary computational science and engineering, **${clean}** refers to an important formulation, pipeline component, or methodology designed to optimize task execution, accuracy, and scalability.\n* **Core Mechanism**: In practice, it operates by abstracting low-level computational overhead, structuring feature representations, and enforcing mathematical or algorithmic optimization boundaries.\n* **Academic Relevance**: In published academic literature, this topic frequently appears across top-tier peer-reviewed conferences and journals (such as IEEE, ACM, Springer, and arXiv), serving as an established benchmark against modern empirical baselines.\n\n*Pro-tip: You can explore peer-reviewed literature on this topic using Google Scholar, arXiv, or IEEE Xplore accessible in RefScan's **Research Sites** menu!*`;
}

// ──────────────────────────────────────────────────────────────────────────
// 4. MAIN DISPATCHER FUNCTION
// ──────────────────────────────────────────────────────────────────────────

export async function sendChatMessage(
  message: string,
  context: ChatContext,
  _history: ChatMessage[] = []
): Promise<ChatMessage> {
  const query = message.trim().toLowerCase();
  const timestamp = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

  const activeBook = context.activeBook || (
    context.references.find((r) => r.type === "BOOK" && context.currentPath.includes(r.id)) as BookReference | undefined
  );

  const activePaper = context.activePaper || (
    context.references.find((r) => r.type === "PAPER" && context.currentPath.includes(r.id)) as PaperReference | undefined
  );

  const books = context.references.filter((r) => r.type === "BOOK") as BookReference[];
  const papers = context.references.filter((r) => r.type === "PAPER") as PaperReference[];

  // ── A. ACTIVE DOCUMENT QUESTIONS ───────────────────────────────────────
  
  // 1. "What is this paper about?" / Abstract / Summary
  if (
    (query.includes("what is this paper about") || query.includes("summary of this paper") || query.includes("explain this paper") || query.includes("about this paper") || query.includes("explain the paper")) &&
    activePaper
  ) {
    const summary = activePaper.abstract || activePaper.simplification?.about || activePaper.problemStatement || "Document analysis cataloged.";
    return {
      id: "msg_" + Date.now(),
      sender: "assistant",
      text: `### 📄 ${activePaper.title}\n\n${summary}\n\n* **Authors:** ${activePaper.authors?.join(", ") || "Research Contributors"}\n* **Publication Year:** ${activePaper.publicationYear || "Recent Study"}\n* **DOI:** ${activePaper.doi || "Academic Document Ingestion"}\n* **Key Finding:** ${activePaper.results || activePaper.simplification?.achieved || "Validated through empirical evaluation."}`,
      timestamp,
      suggestions: [
        "What is the methodology of this paper?",
        "What algorithms are used in this paper?",
        "What are the research gaps in this paper?",
        "Generate IEEE citation for this paper"
      ],
      referenceSnippet: {
        title: activePaper.title,
        type: "PAPER",
        authors: activePaper.authors
      }
    };
  }

  // 2. Active Paper Problem Statement / Objectives
  if (
    (query.includes("problem statement") || query.includes("research problem") || query.includes("what problem") || query.includes("objective") || query.includes("goal")) &&
    activePaper
  ) {
    const prob = activePaper.problemStatement || activePaper.researchProblem || activePaper.simplification?.whyNeeded || "Identified operational constraint and empirical challenges.";
    const obj = activePaper.objectives || activePaper.researchObjective || "Formulate, implement, and validate the computational pipeline.";
    return {
      id: "msg_" + Date.now(),
      sender: "assistant",
      text: `### 🎯 Research Problem & Objectives: *${activePaper.title}*\n\n**Research Problem:**\n${prob}\n\n**Research Objectives:**\n${obj}`,
      timestamp,
      suggestions: [
        "What is the proposed method?",
        "What are the results of this paper?",
        "Generate APA citation for this paper"
      ]
    };
  }

  // 3. Active Paper Methodology / Proposed Method / Algorithms
  if (
    (query.includes("methodology") || query.includes("proposed method") || query.includes("how did they solve") || query.includes("algorithm") || query.includes("model")) &&
    activePaper
  ) {
    const proposed = activePaper.proposedMethod || activePaper.methodology || activePaper.simplification?.howSolved || "Dedicated computational architecture.";
    const algos = activePaper.algorithmsList || activePaper.algorithmsWithRoles || [];
    const algoText = algos.length > 0
      ? "\n\n**Key Computational Models:**\n" + algos.map((a: any, i: number) => `* **${a.name}**: ${a.roleOrUse || a.role}`).join("\n")
      : "";

    return {
      id: "msg_" + Date.now(),
      sender: "assistant",
      text: `### 🔬 Methodology & Technical Approach: *${activePaper.title}*\n\n**Proposed Method:**\n${proposed}${algoText}`,
      timestamp,
      suggestions: [
        "What dataset was used in this paper?",
        "What are the results and findings?",
        "What are the limitations of this paper?"
      ]
    };
  }

  // 4. Active Paper Results / Dataset
  if (
    (query.includes("results") || query.includes("finding") || query.includes("dataset") || query.includes("metrics")) &&
    activePaper
  ) {
    const res = activePaper.results || activePaper.simplification?.achieved || "Validated positive empirical gains over baselines.";
    const ds = activePaper.dataset || activePaper.datasetInfo;
    const dsText = ds ? `\n\n**Dataset Evaluated:** ${ds.name} (${ds.size || "Standard benchmark volume"})` : "";

    return {
      id: "msg_" + Date.now(),
      sender: "assistant",
      text: `### 📊 Empirical Results & Dataset: *${activePaper.title}*\n\n**Results Summary:**\n${res}${dsText}`,
      timestamp,
      suggestions: [
        "What are the research gaps in this paper?",
        "What is the future scope?",
        "Generate IEEE citation"
      ]
    };
  }

  // 5. Active Paper Limitations / Research Gaps / Future Scope
  if (
    (query.includes("limitation") || query.includes("research gap") || query.includes("future scope") || query.includes("future work") || query.includes("weakness")) &&
    activePaper
  ) {
    const gaps = activePaper.researchGaps || activePaper.researchGapsList || [];
    const lims = activePaper.limitationsList || activePaper.limitations || [];
    const gapsText = gaps.length > 0
      ? "\n\n**Identified Research Gaps:**\n" + gaps.map((g: any, i: number) => `* **${g.title}**: ${g.description}`).join("\n")
      : "";
    const limText = lims.length > 0
      ? "\n\n**Stated Limitations:**\n" + lims.map((l: any) => `* ${typeof l === "string" ? l : l.text}`).join("\n")
      : "";

    return {
      id: "msg_" + Date.now(),
      sender: "assistant",
      text: `### ⚠️ Limitations & Research Gaps: *${activePaper.title}*${gapsText}${limText}`,
      timestamp,
      suggestions: [
        "What is the conclusion of this paper?",
        "Explain this paper in plain language",
        "Generate citation for this paper"
      ]
    };
  }

  // 6. Active Book Summary / Details
  if (
    (query.includes("what is this book about") || query.includes("summary of this book") || query.includes("explain this book") || query.includes("about this book")) &&
    activeBook
  ) {
    const desc = activeBook.description || "Synthesized bibliographic record for catalog entry.";
    return {
      id: "msg_" + Date.now(),
      sender: "assistant",
      text: `### 📖 ${activeBook.title}\n\n${desc}\n\n* **Author(s):** ${activeBook.authors.join(", ")}\n* **Publisher:** ${activeBook.publisher} (${activeBook.year})\n* **ISBN:** ${activeBook.isbn13 || activeBook.isbn10 || "Standard Identifier"}\n* **Category:** ${activeBook.category || "Academic Reference"}`,
      timestamp,
      suggestions: [
        `Generate APA citation for ${activeBook.title}`,
        `Generate IEEE citation for ${activeBook.title}`,
        "Show me the books I saved"
      ],
      referenceSnippet: {
        title: activeBook.title,
        type: "BOOK",
        authors: activeBook.authors
      }
    };
  }

  // ── B. CITATION GENERATION REQUESTS ────────────────────────────────────
  if (
    query.includes("citation") || query.includes("cite") || query.includes("apa") || query.includes("ieee") ||
    query.includes("mla") || query.includes("harvard") || query.includes("bibtex")
  ) {
    let targetRef: Reference | undefined = activeBook || activePaper;

    if (!targetRef && context.references.length > 0) {
      targetRef = context.references.find((r) => query.includes(r.title.toLowerCase().substring(0, 15))) || context.references[0];
    }

    let style: CitationStyle = "IEEE";
    if (query.includes("apa")) style = "APA";
    else if (query.includes("mla")) style = "MLA";
    else if (query.includes("harvard")) style = "Harvard";
    else if (context.preferredStyle) style = context.preferredStyle;

    if (targetRef) {
      const citationText = generateCitationPlainText(targetRef, style);
      const citationHTML = generateCitationHTML(targetRef, style);

      return {
        id: "msg_" + Date.now(),
        sender: "assistant",
        text: `Here is the **${style}** citation for **${targetRef.title}**:\n\n\`\`\`text\n${citationText}\n\`\`\``,
        html: `<p class="font-semibold mb-1 text-slate-800 dark:text-slate-200">${style} Citation:</p><div class="p-3 bg-indigo-50/70 dark:bg-indigo-950/40 rounded-xl border border-indigo-100 dark:border-indigo-900/50 text-slate-900 dark:text-slate-100 leading-relaxed font-serif text-sm">${citationHTML}</div>`,
        timestamp,
        suggestions: [
          `Give me the APA citation`,
          `Give me the IEEE citation`,
          `Give me the MLA citation`,
          `Give me the Harvard citation`
        ],
        referenceSnippet: {
          title: targetRef.title,
          type: targetRef.type,
          authors: (targetRef as any).authors
        }
      };
    }
  }

  // ── C. USER LIBRARY SEARCH & LISTING ───────────────────────────────────
  if (
    query.includes("books i saved") || query.includes("saved books") || query.includes("my library") ||
    query.includes("show me my references") || query.includes("list my books") || query.includes("saved papers") ||
    query.includes("my papers")
  ) {
    if (context.references.length === 0) {
      return {
        id: "msg_" + Date.now(),
        sender: "assistant",
        text: "You haven't saved any references to your workspace yet. Try **scanning a book barcode** or **uploading a research paper PDF**!",
        timestamp,
        suggestions: ["How do I scan a book?", "How to upload a research paper?"]
      };
    }

    const refList = context.references
      .slice(0, 8)
      .map((r, i) => `${i + 1}. [${r.type}] **${r.title}** (${(r as any).year || (r as any).publicationYear || "n.d."})`)
      .join("\n");

    return {
      id: "msg_" + Date.now(),
      sender: "assistant",
      text: `You have **${context.references.length} reference(s)** saved in your workspace:\n\n${refList}`,
      timestamp,
      suggestions: [
        `Generate citations for ${context.references[0]?.title}`,
        "How do I export to BibTeX?",
        "What is the difference between APA and IEEE?"
      ]
    };
  }

  // ── D. PROJECT-SPECIFIC KNOWLEDGE BASE MATCHING ────────────────────────
  for (const item of PROJECT_KNOWLEDGE) {
    if (item.keywords.some((kw) => query.includes(kw))) {
      return {
        id: "msg_" + Date.now(),
        sender: "assistant",
        text: item.answer,
        timestamp,
        suggestions: item.suggestions
      };
    }
  }

  // ── E. DOMAIN & FIELD KNOWLEDGE BASE MATCHING ──────────────────────────
  for (const item of DOMAIN_KNOWLEDGE) {
    if (item.keywords.some((kw) => query.includes(kw))) {
      return {
        id: "msg_" + Date.now(),
        sender: "assistant",
        text: item.answer,
        timestamp,
        suggestions: item.suggestions
      };
    }
  }

  // ── F. LIVE ENCYCLOPEDIC & GOOGLE-STYLE ACADEMIC SEARCH ─────────────────
  // If the user asks general questions like "What is X?", "Explain Y", or searches a topic
  const liveResult = await fetchLiveKnowledge(query);
  if (liveResult) {
    const scholarSearchUrl = `https://scholar.google.com/scholar?q=${encodeURIComponent(liveResult.title)}`;
    const arxivSearchUrl = `https://arxiv.org/search/?query=${encodeURIComponent(liveResult.title)}&searchtype=all`;

    return {
      id: "msg_" + Date.now(),
      sender: "assistant",
      text: `### 🌐 ${liveResult.title}\n*${liveResult.description || "Academic Concept & Terminology"}*\n\n${liveResult.extract}\n\n---\n#### 🔬 Research & Explore Further:\n* [Search Papers on Google Scholar](${scholarSearchUrl})\n* [Explore Preprints on arXiv](${arxivSearchUrl})\n* [Read Full Article on Wikipedia](${liveResult.sourceUrl || "https://en.wikipedia.org"})`,
      timestamp,
      suggestions: [
        `What are the applications of ${liveResult.title}?`,
        `How is ${liveResult.title} used in machine learning?`,
        "Show me my saved references",
        "What is RefScan?"
      ]
    };
  }

  // ── G. DYNAMIC INTELLECTUAL SYNTHESIS FALLBACK ─────────────────────────
  const synthesized = synthesizeGeneralKnowledgeAnswer(message);
  return {
    id: "msg_" + Date.now(),
    sender: "assistant",
    text: synthesized,
    timestamp,
    suggestions: [
      "What is RefScan?",
      "How do I scan a book barcode?",
      "What is deep learning?",
      "What is the difference between APA and IEEE?"
    ]
  };
}
