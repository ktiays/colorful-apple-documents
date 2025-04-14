(function () {
  "use strict";

  // --- Configuration ---
  const NAVIGATOR_ICON_SELECTOR = "div.TopicTypeIcon.navigator-icon"; // CSS selector for target icon elements
  const PROCESSED_ATTR = "data-custom-processed"; // Attribute to mark elements that have been processed
  const BASE_STYLE_CLASS = "custom-navigator-icon"; // Base CSS class for custom styling
  const TWOPATH_STYLE_CLASS = "custom-navigator-icon-twopath"; // Specific class for two-path icons
  const COLOR_VARIANT_ATTR = "data-color-variant"; // Data attribute to store the determined color variant

  // --- Helper Functions ---

  /**
   * Extracts and combines text content from tspan elements within an SVG, sorted by x-coordinate.
   * Falls back to the SVG's total text content if no tspans are found.
   * @param {SVGElement} svgIcon - The SVG element containing the text.
   * @returns {string} The extracted and combined text, or an empty string if no text is found.
   */
  function getTextFromSvg(svgIcon) {
    const tspans = Array.from(svgIcon.querySelectorAll("tspan"));

    if (tspans.length > 0) {
      return tspans
        .map((tspan) => ({
          text: tspan.textContent || "",
          x: parseFloat(tspan.getAttribute("x") || "0"),
        }))
        .sort((a, b) => a.x - b.x) // Sort by horizontal position
        .map((span) => span.text)
        .join(""); // Combine text
    } else {
      // Fallback if no tspans are present
      return svgIcon.textContent ? svgIcon.textContent.trim() : "";
    }
  }

  /**
   * Determines the color variant based on the icon's text content.
   * @param {string} text - The text content extracted from the icon.
   * @returns {string} The color variant name (e.g., 'purple', 'blue').
   */
  function getColorVariant(text) {
    const upperCaseText = text.toUpperCase();
    switch (upperCaseText) {
      case "S":
      case "C":
      case "PR":
        return "purple";
      case "M":
        return "blue";
      case "P":
        return "mint";
      case "T":
      case "E":
        return "orange";
      case "#":
        return "red";
      default:
        return "green"; // Default color
    }
  }

  /**
   * Applies styling and text content to a target element.
   * Adds base class, color variant attribute, and the extracted text.
   * @param {HTMLElement} element - The element to modify.
   * @param {string} text - The text to display.
   * @param {string} colorVariant - The color variant to apply.
   */
  function applyStylesAndText(element, text, colorVariant) {
    element.classList.add(BASE_STYLE_CLASS);
    element.setAttribute(COLOR_VARIANT_ATTR, colorVariant);

    // Add the text content if it exists and isn't already present
    if (text) {
      // Avoid adding duplicate text nodes if the mutation observer triggers multiple times
      const existingTextNode = Array.from(element.childNodes).find(
        (node) => node.nodeType === Node.TEXT_NODE && node.textContent === text
      );
      if (!existingTextNode) {
        const textNode = document.createTextNode(text);
        element.appendChild(textNode);
      }
    }
    // Mark as processed
    element.dataset.customProcessed = "true";
  }

  /**
   * Checks if an element needs processing and applies modifications if necessary.
   * It extracts text from SVG, determines color, and updates the element's style and content.
   * @param {Element} element - The DOM element to check and potentially modify.
   */
  function checkAndModifyElement(element) {
    // Validate: Ensure it's an element, matches the selector, and hasn't been processed
    if (
      element.nodeType !== Node.ELEMENT_NODE ||
      !element.matches(NAVIGATOR_ICON_SELECTOR) ||
      element.dataset.customProcessed === "true"
    ) {
      return;
    }

    // Find SVG: Locate the SVG icon within the element
    const svgIcon = element.querySelector("svg");

    // Handle specific multi-path SVG case (e.g., Tag icon)
    if (svgIcon) {
      const paths = svgIcon.querySelectorAll("path");
      if (paths.length >= 2) {
        // Check if there are 2 or more paths
        // Remove the first path (often the background shape)
        paths[0].remove();
        // Color all remaining paths white
        for (let i = 1; i < paths.length; i++) {
          paths[i].setAttribute("fill", "white");
        }
        // Apply the specific style class (green background, keeps SVG visible)
        element.classList.add(TWOPATH_STYLE_CLASS);
        element.dataset.customProcessed = "true"; // Mark as processed
        return; // Skip further processing for this specific case
      }
    }

    // Handle SVGs without <text>: Mark as processed but don't style if SVG exists but has no text element (likely decorative)
    if (svgIcon && !svgIcon.querySelector("text")) {
      element.dataset.customProcessed = "true"; // Mark to avoid re-checking
      return;
    }

    // Extract Text: Get text from the SVG
    const combinedText = svgIcon ? getTextFromSvg(svgIcon) : "";

    // Determine Color: Get the appropriate color variant
    const colorVariant = getColorVariant(combinedText);

    // Apply Styles: Add classes, attributes, and the text node
    applyStylesAndText(element, combinedText, colorVariant);
    // Note: applyStylesAndText already marks as processed
  }

  /**
   * Handles DOM mutations to process dynamically added or modified elements.
   * @param {MutationRecord[]} mutationsList - A list of mutation records.
   * @param {MutationObserver} observer - The observer instance.
   */
  function handleMutations(mutationsList, observer) {
    for (const mutation of mutationsList) {
      if (mutation.type === "childList") {
        // Process newly added nodes
        mutation.addedNodes.forEach((node) => {
          if (node.nodeType === Node.ELEMENT_NODE) {
            // Check the node itself
            checkAndModifyElement(node);
            // Check children of the added node that match the selector
            node
              .querySelectorAll(NAVIGATOR_ICON_SELECTOR)
              .forEach(checkAndModifyElement);
          }
        });
        // Removed nodes don't require action in this script
      } else if (mutation.type === "attributes") {
        // Re-check element if relevant attributes (like class) change
        if (mutation.target.nodeType === Node.ELEMENT_NODE) {
          // Reset processed flag if attributes change, as it might need re-styling
          // Note: This might be overly aggressive depending on which attributes change.
          // Consider checking mutation.attributeName if specific attributes matter.
          // delete mutation.target.dataset.customProcessed; // Optional: Uncomment if re-processing is needed on attribute change
          checkAndModifyElement(mutation.target);
        }
      }
    }
  }

  // --- Initialization ---

  /**
   * Initializes the script by processing existing elements and setting up the MutationObserver.
   */
  function initialize() {
    // Process all matching elements present on initial page load
    document
      .querySelectorAll(NAVIGATOR_ICON_SELECTOR)
      .forEach(checkAndModifyElement);

    // Set up the observer to watch for future changes
    const observer = new MutationObserver(handleMutations);
    const config = {
      childList: true, // Observe direct children additions/removals
      subtree: true, // Observe all descendants
      attributes: true, // Observe attribute changes
      attributeFilter: ["class", "id", "style"], // Be more specific if needed
    };

    observer.observe(document.body, config); // Start observing the body for changes

    console.log("Colorful Apple Docs Icons script initialized.");
  }

  // Run the initialization logic
  initialize();
})(); // End of IIFE
