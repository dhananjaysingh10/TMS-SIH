
import fetch from 'node-fetch';

async function createTicket() {
    try {
        const response = await fetch('http://localhost:10000/api/ticket', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                title: "Test Ticket DisplayId",
                description: "Verifying uniqueness",
                useremail: "system@ticketing.local",
                priority: "medium",
                type: "support",
                department: "IT"
            })
        });

        const text = await response.text();
        console.log("Raw Response:", text);

        let data;
        try {
            data = JSON.parse(text);
        } catch (e) {
            console.error("Failed to parse JSON");
            return;
        }

        console.log("Status:", response.status);

        if (data.success && data.data && data.data.displayId && data.data.displayId.startsWith('TKT')) {
            console.log("\n✅ Verification SUCCESS: displayId is present: " + data.data.displayId);
        } else {
            console.log("\n❌ Verification FAILED: displayId missing or invalid.");
            console.log(JSON.stringify(data, null, 2));
        }

    } catch (error) {
        console.error("Error:", error);
    }
}

createTicket();
