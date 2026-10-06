import { jsPDF } from "jspdf";
import fs from "fs";
import path from "path";

// Generate a realistic academic research paper PDF
const doc = new jsPDF({
  unit: "pt",
  format: "a4",
});

// Page 1 Header Banner (small font)
doc.setFontSize(8);
doc.setTextColor(100, 100, 100);
doc.text("IEEE TRANSACTIONS ON PATTERN ANALYSIS AND MACHINE INTELLIGENCE, VOL. 45, NO. 3, MARCH 2023", 40, 40);
doc.text("DOI: 10.1109/TPAMI.2023.9876543", 40, 52);

// Title (Large font, 18pt bold)
doc.setFontSize(18);
doc.setTextColor(20, 20, 20);
doc.text("Multi-Scale Vision Transformer for Autonomous Drone Navigation", 40, 90);

// Authors (11pt)
doc.setFontSize(11);
doc.setTextColor(50, 50, 50);
doc.text("Arunachalam Suresh, Priya Venkatesh, and David R. Miller", 40, 120);

// Affiliations & Emails (9pt italic)
doc.setFontSize(9);
doc.setTextColor(90, 90, 90);
doc.text("Department of Computer Science, Stanford University, California, USA", 40, 138);
doc.text("Correspondence email: {asuresh, priyav}@cs.stanford.edu", 40, 150);

// Abstract Heading & Text
doc.setFontSize(11);
doc.setTextColor(20, 20, 20);
doc.text("Abstract", 40, 180);

doc.setFontSize(9.5);
doc.setTextColor(40, 40, 40);
const abstractText = "Autonomous navigation for aerial vehicles requires high-precision perception under dynamic environmental conditions. However, conventional CNN methods fail to capture long-range contextual spatial relationships across complex outdoor environments. In this paper, we propose a multi-scale vision transformer architecture that fuses temporal attention with lightweight feature pyramids. Evaluated on the UAV-Benchmark dataset consisting of 25,000 flight sequences, our model achieves an accuracy of 96.4% and outperforms existing baselines by 14.2% while reducing latency. However, performance degrades under extreme low-light conditions and heavy fog. In future work, we plan to integrate multimodal LiDAR sensors to enhance robustness.";
const splitAbstract = doc.splitTextToSize(abstractText, 515);
doc.text(splitAbstract, 40, 195);

// Keywords
doc.setFontSize(9);
doc.setTextColor(60, 60, 60);
doc.text("Keywords: Vision Transformer, Drone Navigation, Autonomous Systems, Multi-Scale Attention, Robotics", 40, 260);

// Section 1: Introduction
doc.setFontSize(12);
doc.setTextColor(20, 20, 20);
doc.text("1. Introduction", 40, 290);

doc.setFontSize(9.5);
doc.setTextColor(40, 40, 40);
const introText = "Unmanned aerial vehicles (UAVs) have observed widespread adoption in search-and-rescue, agricultural monitoring, and surveillance applications. Despite significant progress in autonomous flight, reliable collision avoidance in dense obstacles remains a fundamental bottleneck. Conventional existing methods rely primarily on standard Convolutional Neural Networks and optical flow baselines which struggle with rapid viewpoint variations.";
doc.text(doc.splitTextToSize(introText, 515), 40, 305);

// Section 2: Proposed Methodology
doc.setFontSize(12);
doc.setTextColor(20, 20, 20);
doc.text("2. Proposed Methodology and Architecture", 40, 370);

doc.setFontSize(9.5);
doc.setTextColor(40, 40, 40);
const methodText = "The proposed framework integrates a hierarchical Transformer backbone with YOLOv8 detection heads for fast obstacle localization. We utilize PyTorch and CUDA acceleration to achieve 45 FPS on embedded hardware. Our primary objective is to formulate an end-to-end perception pipeline capable of zero-shot transfer.";
doc.text(doc.splitTextToSize(methodText, 515), 40, 385);

// Section 3: Experimental Evaluation and Results
doc.setFontSize(12);
doc.setTextColor(20, 20, 20);
doc.text("3. Experimental Evaluation and Results", 40, 450);

doc.setFontSize(9.5);
doc.setTextColor(40, 40, 40);
const resultsText = "We conduct extensive experiments on the UAV-Benchmark dataset with 25,000 video frames. Our proposed approach achieves an accuracy of 96.4% and yields an improvement of 14.2% over ResNet baselines with an F1-score of 0.94. The inference latency remains under 22ms per frame.";
doc.text(doc.splitTextToSize(resultsText, 515), 40, 465);

// Section 4: Limitations and Future Work
doc.setFontSize(12);
doc.setTextColor(20, 20, 20);
doc.text("4. Limitations and Future Work", 40, 530);

doc.setFontSize(9.5);
doc.setTextColor(40, 40, 40);
const limitText = "A key limitation of our method is that performance degrades under adverse weather such as heavy precipitation and low illumination. Furthermore, memory consumption is higher during dense attention computation. In future work, we plan to explore cross-modal sensor fusion and quantization techniques.";
doc.text(doc.splitTextToSize(limitText, 515), 40, 545);

// Section 5: Conclusion
doc.setFontSize(12);
doc.setTextColor(20, 20, 20);
doc.text("5. Conclusion", 40, 610);

doc.setFontSize(9.5);
doc.setTextColor(40, 40, 40);
const conclText = "In conclusion, this paper presented a multi-scale vision transformer tailored for real-time autonomous drone navigation with superior accuracy and robust spatial reasoning.";
doc.text(doc.splitTextToSize(conclText, 515), 40, 625);

// References
doc.setFontSize(11);
doc.setTextColor(20, 20, 20);
doc.text("References", 40, 670);

doc.setFontSize(8.5);
doc.setTextColor(50, 50, 50);
doc.text("[1] A. Vaswani, N. Shazeer, N. Parmar, et al., 'Attention is All You Need,' NeurIPS, 2017.", 40, 685);
doc.text("[2] K. He, X. Zhang, S. Ren, and J. Sun, 'Deep Residual Learning for Image Recognition,' CVPR, 2016.", 40, 700);
doc.text("[3] J. Redmon, S. Divvala, R. Girshick, and A. Farhadi, 'You Only Look Once,' CVPR, 2016.", 40, 715);

const pdfBytes = doc.output("arraybuffer");
const outPath = path.join(process.cwd(), "scratch", "sample_paper.pdf");
fs.writeFileSync(outPath, Buffer.from(pdfBytes));
console.log("Created sample academic paper PDF at:", outPath);

