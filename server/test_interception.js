
import fetch from "node-fetch";

const API_URL = "http://localhost:10000/api/ticket/frontend";
const USER_EMAIL = "dhananjay.ecell@gmail.com"; 

async function testInterception(title, description, expectedEscalation) {
    console.log(`\n--- Testing: ${title} ---`);
    try {
        const response = await fetch(API_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                title: title,
                description: description,
                useremail: USER_EMAIL
            })
        });
        
        const data = await response.json();
        console.log("Status:", response.status);
        console.log("Response:", JSON.stringify(data, null, 2));

        if (data.success && data.data.autoEscalated === expectedEscalation) {
            console.log("✅ TEST PASSED");
        } else {
            console.log("❌ TEST FAILED");
            console.log(`Expected autoEscalated: ${expectedEscalation}, Got: ${data.data?.autoEscalated}`);
        }

    } catch (error) {
        console.error("Request Failed:", error);
    }
}

async function runTests() {
    // Test 1: Known issue (should NOT escalate)
    await testInterception("Password Reset", "How do I reset my password?", false);

    // Test 2: Unknown issue (should escalate)
    await testInterception("Mars Flight", "How do I book a flight to Mars?", true);
}

runTests();
