// Define a function to update the content based on the route
function renderView(viewName) {
    const appDiv = document.getElementById("app");
    appDiv.innerHTML = ""; // Clear existing content

    switch (viewName) {
        case "home":
            appDiv.innerHTML = "<h1>Welcome Home!</h1><p>This is the home page content.</p>";
            break;
        case "about":
            appDiv.innerHTML = "<h1>About Us</h1><p>Learn more about our company.</p>";
            break;
        case "contact":
            appDiv.innerHTML = "<h1>Contact Us</h1><p>Get in touch with us.</p>";
            break;
        default:
            appDiv.innerHTML = "<h1>404 - Page Not Found</h1>";
    }
}

// Handle initial route on page load and subsequent hash changes
function handleRouteChange() {
    const currentHash = window.location.hash.slice(1); // Remove the '#'
    renderView(currentHash || "home"); // Default to 'home' if no hash is present
}

// Listen for hash changes
window.addEventListener("hashchange", handleRouteChange);

// Render the initial view
handleRouteChange();

// Navigation links
const navLinks = document.createElement("nav");
navLinks.innerHTML = `
    <a href="#home">Home</a> | 
    <a href="#about">About</a> | 
    <a href="#contact">Contact</a>
`;
document.body.insertBefore(navLinks, document.getElementById("app"));
