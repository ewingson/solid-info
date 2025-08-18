// base code Noel and Gemini -->
// --- SECTION 1: CONFIGURATION ---
// oidc issuer will be prompted
// const SOLID_OIDC_ISSUER = "https://teamid.live";
const FOAF_NAME_PREDICATE = "http://xmlns.com/foaf/0.1/name";

// --- SECTION 2: UI ELEMENT REFERENCES ---
const loadingDiv = document.getElementById('loading');
const guestDiv = document.getElementById('auth-guest');
const userDiv = document.getElementById('auth-user');
const loginButton = document.getElementById('login-button');
const logoutButton = document.getElementById('logout-button');
const usernameSpan = document.getElementById('username');

// --- SECTION 3: CORE SOLID LOGIC ---

/**
 * Restores a previous session or handles the redirect from the login provider.
 * This is the main entry point of the application.
 */
async function main() {
    try {
        // Handle the redirect from the Solid Identity Provider.
        await solidClientAuthentication.handleIncomingRedirect({ restorePreviousSession: true });

        // Get the current session information.
        const session = solidClientAuthentication.getDefaultSession();

        // If not logged in, show the guest view and stop.
        if (!session.info.isLoggedIn) {
            updateUI(false);
            return;
        }

        // If logged in, fetch the user's name and update the UI.
        const user = await fetchUserProfile(session.info.webId);
        updateUI(true, user.name);

    } catch (error) {
        alert(error.message);
        updateUI(false); // If an error occurs, show the guest view.
    }
}

/**
 * Fetches the user's name from their Solid profile.
 * @param {string} webId - The WebID of the user.
 * @returns {Promise<object>} An object containing the user's name.
 */
async function fetchUserProfile(webId) {
    // This function uses the `readSolidDocument` helper below.
    const profileQuads = await readSolidDocument(webId);

    // Find the quad containing the foaf:name.
    const nameQuad = profileQuads.find(quad => quad.predicate.value === FOAF_NAME_PREDICATE);

    return {
        name: nameQuad?.object.value || 'Anonymous'
    };
}

/**
 * A low-level helper to fetch and parse a Solid document.
 * @param {string} url - The URL of the document to read.
 * @returns {Promise<Array>} An array of quads from the parsed document.
 */
async function readSolidDocument(url) {
    // Use the authenticated fetch from the library.
    const response = await solidClientAuthentication.fetch(url, { headers: { Accept: 'text/turtle' } });
    if (Math.floor(response.status / 100) !== 2) return []; // Return empty on error.
    
    const data = await response.text();
    // The n3.min.js bundle exposes the Parser directly on the global N3 object.
    const parser = new N3.Parser({ baseIRI: url }); 

    return parser.parse(data);
}

// --- SECTION 4: UI AND EVENT HANDLING ---

/**
 * Updates the user interface based on the login state.
 * @param {boolean} isLoggedIn - Whether the user is logged in.
 * @param {string} [name] - The user's name, if logged in.
 */
function updateUI(isLoggedIn, name) {
    loadingDiv.setAttribute('hidden', ''); // Hide loading message

    if (isLoggedIn) {
        guestDiv.setAttribute('hidden', '');
        userDiv.removeAttribute('hidden');
        usernameSpan.textContent = name;
    } else {
        userDiv.setAttribute('hidden', '');
        guestDiv.removeAttribute('hidden');
    }
}

// Attach event listeners to buttons.
loginButton.onclick = () => {
    solidClientAuthentication.login({
        oidcIssuer: SOLID_OIDC_ISSUER, //user will provide this value per prompt
        redirectUrl: window.location.href,
        clientName: 'Solid Info App'
    });
};

logoutButton.onclick = async () => {
    logoutButton.setAttribute('disabled', '');
    await solidClientAuthentication.logout();
    logoutButton.removeAttribute('disabled');
    updateUI(false); // Reset to guest view.
};


// --- SECTION 5: START THE APPLICATION ---
main();
