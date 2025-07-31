// Get a reference to the container div
const container = document.getElementById("dynamic-content-container");

// Create and configure elements
const heading = document.createElement("h1");
heading.textContent = "Welcome to my Dynamic Page!";

const paragraph = document.createElement("p");
paragraph.textContent = "This page was generated using JavaScript.";

const button = document.createElement("button");
button.textContent = "Click Me!";

// Add interactivity
button.addEventListener("click", () => {
    alert("Button clicked! You're interacting with a dynamic element.");
});

// Append elements to the container
container.appendChild(heading);
container.appendChild(paragraph);
container.appendChild(button);
