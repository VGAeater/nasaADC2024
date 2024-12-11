import { data } from "./data.js";
import { scene } from "./scene.js";
import { minimap } from "./minimap.js";

const menu = document.getElementById("menu");

var dataObject;
var sceneObject, minimapObject;
var shared = {
  isDragging: false,
  time: 0,
  trackBonus: false,
};

window.onload = () => {
  dataObject = new data();
  sceneObject = new p5(scene(dataObject, shared));
  minimapObject = new p5(minimap(dataObject, shared));
};

document.addEventListener("DOMContentLoaded", () => {
  const tabs = document.querySelectorAll(".tab");
  const keyContainer = document.getElementById("keyContainer");
  const settingsContainer = document.getElementById("settingsContainer");
  const dataContainer = document.getElementById("dataContainer");

  tabs.forEach((tab) => {
    tab.addEventListener("click", () => {
      document.querySelector(".tab.selected")?.classList.remove("selected");
      tab.classList.add("selected");

      keyContainer.classList.add("hidden");
      settingsContainer.classList.add("hidden");
      dataContainer.classList.add("hidden");

      if (tab.id === "tabKey") {
        keyContainer.classList.remove("hidden");
      } else if (tab.id === "tabSettings") {
        settingsContainer.classList.remove("hidden");
      } else if (tab.id === "tabData") {
        dataContainer.classList.remove("hidden");
      }
    });
  });
});

// Function to open the menu
function openMenu() {
    const menu = document.getElementById("menuContainer");
    if (menu) {
      menu.classList.toggle("hide");
    }
  }

// Listen for messages from the WebView
document.addEventListener("message", (event) => {
  console.log("Received message from React Native: " + event.data);
  openMenu();
});

// For iOS WebView (since it uses `window.ReactNativeWebView` for communication)
window.addEventListener("message", (event) => {
  console.log("Received message from React Native: " + event.data);
  openMenu();
});

// Disable scroll behind menu
const menuContainer = document.getElementById("menuContainer");

menuContainer.addEventListener(
  "wheel",
  (e) => {
    e.stopPropagation();
  },
  { passive: true }
);
