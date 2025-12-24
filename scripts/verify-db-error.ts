import { isDatabaseError } from "../lib/errors.js";
import { withErrorThrower } from "../lib/action-utils.js";

async function runTest() {
    console.log("--- Starting Verification: Database Error Handling ---");

    // Test 1: isDatabaseError detection
    const connectionError = new Error("Connection refused at 127.0.0.1:5432");
    if (isDatabaseError(connectionError)) {
        console.log("✅ Test 1 Passed: Correctly identified connection refused error.");
    } else {
        console.error("❌ Test 1 Failed: Did not identify connection refused error.");
        process.exit(1);
    }

    const genericError = new Error("Something went wrong");
    if (!isDatabaseError(genericError)) {
        console.log("✅ Test 2 Passed: Correctly ignored generic error.");
    } else {
        console.error("❌ Test 2 Failed: Incorrectly identified generic error as DB error.");
        process.exit(1);
    }

    // Test 3: withErrorThrower transformation
    const mockDbAction = async () => {
        throw new Error("ETIMEDOUT: Connection timeout");
    };

    const wrappedAction = withErrorThrower(mockDbAction);

    try {
        await wrappedAction();
        console.error("❌ Test 3 Failed: Wrapped action did not throw.");
        process.exit(1);
    } catch (error: any) {
        const expectedMessage = "Désolé, le service est temporairement indisponible. Notre base de données ne répond pas. Veuillez réessayer dans quelques instants.";
        if (error.message === expectedMessage) {
            console.log("✅ Test 3 Passed: Correctly transformed DB error message.");
        } else {
            console.error(`❌ Test 3 Failed: Wrong error message. Got: "${error.message}"`);
            process.exit(1);
        }
    }

    // Test 4: withErrorThrower preserves non-db errors
    const mockGenericAction = async () => {
        throw new Error("Validation failed");
    };

    const wrappedGenericAction = withErrorThrower(mockGenericAction);

    try {
        await wrappedGenericAction();
        console.error("❌ Test 4 Failed: Wrapped generic action did not throw.");
        process.exit(1);
    } catch (error: any) {
        if (error.message === "Validation failed") {
            console.log("✅ Test 4 Passed: Preserved generic error message.");
        } else {
            console.error(`❌ Test 4 Failed: Generic error message was altered. Got: "${error.message}"`);
            process.exit(1);
        }
    }

    console.log("--- Verification Complete: All Tests Passed! ---");
}

runTest().catch(err => {
    console.error("Unexpected error during verification:", err);
    process.exit(1);
});
