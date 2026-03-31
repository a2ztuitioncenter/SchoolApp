try {
  const res = await fetch("http://127.0.0.1:3000/health");
  console.log("Response status:", res.status);
  const data = await res.json();
  console.log("Response data:", data);
} catch (e) {
  console.error("Connection failed:", e.message);
  try {
    const res2 = await fetch("http://localhost:3000/health");
    console.log("Retry with localhost status:", res2.status);
  } catch (e2) {
    console.error("Retry with localhost also failed:", e2.message);
  }
}
