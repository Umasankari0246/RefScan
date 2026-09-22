async function test() {
  console.log("--- Starting RefScan MongoDB Verification ---");

  // 1. Check Health
  const healthRes = await fetch("http://localhost:8443/api/health");
  const health = await healthRes.json();
  console.log("Health Status:", health.status);
  console.log("Database Mode:", health.database.mode);
  console.log("Database Name:", health.database.databaseName);
  console.log("Collections:", health.database.collections);

  // 2. Reference CRUD Test
  const testRef = {
    id: "test_book_algorithms",
    type: "BOOK",
    title: "Introduction to Algorithms, Fourth Edition",
    authors: ["Thomas H. Cormen", "Charles E. Leiserson", "Ronald L. Rivest", "Clifford Stein"],
    publisher: "The MIT Press",
    year: 2022,
    isbn13: "978-0262046305",
    category: "Computer Science",
    dateAdded: new Date().toISOString().split("T")[0],
    saved: true
  };

  // CREATE
  const createRes = await fetch("http://localhost:8443/api/references", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(testRef)
  });
  const created = await createRes.json();
  console.log("Create Reference Response:", created.success, created.data?.title);

  // READ
  const getRes = await fetch(`http://localhost:8443/api/references/${testRef.id}`);
  const fetched = await getRes.json();
  console.log("Read Reference Response:", fetched.success, fetched.data?.title);

  // UPDATE
  const updateRes = await fetch(`http://localhost:8443/api/references/${testRef.id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ title: "Introduction to Algorithms (4th Edition - MIT Press)" })
  });
  const updated = await updateRes.json();
  console.log("Update Reference Response:", updated.success, updated.data?.title);

  // DELETE
  const delRes = await fetch(`http://localhost:8443/api/references/${testRef.id}`, {
    method: "DELETE"
  });
  const deleted = await delRes.json();
  console.log("Delete Reference Response:", deleted.success);

  // 3. Paper Analysis Save & Re-open Test
  const testPaper = {
    title: "Deep Residual Learning for Image Recognition",
    authors: ["Kaiming He", "Xiangyu Zhang", "Shaoqing Ren", "Jian Sun"],
    journal: "IEEE CVPR",
    publicationYear: 2016,
    abstract: "Deeper neural networks are more difficult to train. We present a residual learning framework to ease the training of networks that are substantially deeper than those used previously.",
    researchProblem: "Degradation problem in very deep networks.",
    researchObjective: "Ease optimization and gain accuracy from considerably increased depth.",
    methodology: "Residual skip connections allowing gradient flow directly through identity shortcuts.",
    algorithms: ["ResNet-50", "ResNet-101", "ResNet-152", "Skip Connections"],
    results: "Won 1st place on the ILSVRC 2015 classification task with 3.57% top-5 error.",
    researchGaps: [
      {
        id: "gap_resnet_1",
        title: "Diminishing returns on extreme depth beyond 1000 layers",
        category: "Architectural Limits",
        description: "Training 1202-layer networks leads to overfitting on small datasets.",
        strength: "moderate"
      }
    ]
  };

  const uploadRes = await fetch("http://localhost:8443/api/papers/upload", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(testPaper)
  });
  const uploaded = await uploadRes.json();
  console.log("Paper Analysis Upload Response:", uploaded.success, uploaded.data?.id, uploaded.data?.title);

  // Re-open paper
  const paperId = uploaded.data?.id;
  if (paperId) {
    const paperGetRes = await fetch(`http://localhost:8443/api/papers/${paperId}`);
    const paperFetched = await paperGetRes.json();
    console.log("Paper Re-open Response:", paperFetched.success, paperFetched.data?.title, "Gaps count:", paperFetched.data?.researchGaps?.length);
  }

  // 4. Citation Paper Save & Re-open Test
  const testCitationDoc = {
    id: "citation_paper_cvpr_resnet",
    title: "Computer Vision & Residual Networks Citation Sheet",
    citationStyle: "IEEE",
    referenceIds: [paperId || "paper_attention_2017"],
    references: [
      {
        id: paperId || "paper_attention_2017",
        title: testPaper.title,
        authors: testPaper.authors,
        journal: testPaper.journal,
        publicationYear: testPaper.publicationYear,
        type: "PAPER"
      }
    ],
    formattedText: `[1] K. He, X. Zhang, S. Ren, and J. Sun, "Deep Residual Learning for Image Recognition," IEEE CVPR, 2016.`,
    referenceCount: 1,
    customNotes: "Prepared for CVPR research study."
  };

  const saveCitationRes = await fetch("http://localhost:8443/api/citation-papers", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(testCitationDoc)
  });
  const savedCitation = await saveCitationRes.json();
  console.log("Save Citation Paper Response:", savedCitation.success, savedCitation.data?.id);

  // Re-open Citation Paper
  const getCitationRes = await fetch(`http://localhost:8443/api/citation-papers/${testCitationDoc.id}`);
  const reopenedCitation = await getCitationRes.json();
  console.log("Citation Paper Re-open Response:", reopenedCitation.success, reopenedCitation.data?.title);

  // Final count check
  const finalHealthRes = await fetch("http://localhost:8443/api/health");
  const finalHealth = await finalHealthRes.json();
  console.log("Final Database Collections Status:", finalHealth.database.collections);
  console.log("--- All Tests Completed Successfully ---");
}

test().catch(err => {
  console.error("Test failed:", err);
  process.exit(1);
});

