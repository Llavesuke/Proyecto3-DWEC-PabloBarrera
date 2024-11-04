import { loadCartItems } from "./carritoApp.js"

// Global variables
let isFormValid = false
let db // Variable for the database

// Selectors
const authorField = document.querySelector("#autor")
const titleField = document.querySelector("#titulo")
const form = document.querySelector("#formulario-curso")
const submitBtn = form.querySelector("button[type='submit']")
const dropZone = document.querySelector("#drop-zone")
const imageInput = document.querySelector("#image-input")
const preview = document.querySelector("#preview")

// Initialize the database
function initDB() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open("Cursos", 3)

        request.onupgradeneeded = function(e) {
            db = e.target.result;
          
            if (!db.objectStoreNames.contains("cursos")) {
                db.createObjectStore("cursos", { keyPath: "id", autoIncrement: true })
            }
            // Ensure the cart exists
            if (!db.objectStoreNames.contains("carrito")) {
                db.createObjectStore("carrito", { keyPath: "id", autoIncrement: true })
            }
        }

        request.onsuccess = function(e) {
            db = e.target.result
            console.log("Database connection established")
            resolve()
        }

        request.onerror = function(e) {
            console.error("Error connecting to the database ", e.target.error)
            reject(e.target.error)
        }
    })
}

// Database operations
function addCourse(course) {
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(["cursos"], "readwrite")
        const objectStore = transaction.objectStore("cursos")
        const request = objectStore.add(course)

        request.onsuccess = function() {
            console.log("Course added successfully")
            resolve()
        };

        request.onerror = function() {
            console.error("Error adding course")
            reject()
        }
    })
}

// Check if a course exists
async function courseExists(title, author) {
    return new Promise((resolve) => {
        const transaction = db.transaction(["cursos"], "readonly")
        const objectStore = transaction.objectStore("cursos")
        const index = objectStore.index("nombre"); // Use the "nombre" index for searching

        const request = index.getAll(title)

        request.onsuccess = function() {
            const courses = request.result
            // Check if any course has the same author
            const exists = courses.some(course => course.instructor === author)
            resolve(exists);
        };

        request.onerror = function() {
            console.error("Error checking if the course exists")
            resolve(false)
        }
    })
}

// Interface initialization
document.addEventListener("DOMContentLoaded", () => {
    initDB()
    .then(() => loadCartItems())
})

// Listeners for validation and form submission
authorField.addEventListener("blur", verify)
titleField.addEventListener("blur", verify)

form.addEventListener("submit", async (e) => {
    e.preventDefault(); // Prevent the default form submission behavior

    if (isFormValid) {
        // Get the image in base64
        const imageBase64 = preview.src

        // Create the course object in the specified format
        const courseObj = {
            nombre: titleField.value,
            instructor: authorField.value,
            precio: 200,
            imagen: imageBase64 // Add the image in base64 format
        };
        console.log("Attempting to add the following course: ", courseObj)

        // Add the course to the courses table
        await addCourse(courseObj);
        resetData();
    } else {
        console.log("The form is not valid. Please correct the errors before submitting.")
    }
})

// Validations
async function verify(e) {
    const { name, value } = e.target

    const validationFunctions = {
        "autor": verifyName,
        "titulo": () => ({ isValid: true, message: "" })
    };

    let exists = false; // Initialize the variable here

    if (validationFunctions[name]) {
        const { isValid, message } = validationFunctions[name](value)

        if (isValid) {
            cleanAlert(e.target.parentElement)
        } else {
            showAlert(e.target.parentElement, message)
        }
    }

    // Check if the title and author are the same in the database
    const authorValue = authorField.value.trim()
    const titleValue = titleField.value.trim()

    if (authorValue && titleValue) {
        exists = await courseExists(titleValue, authorValue) // Assign the result here
        
        if (exists) {
            showAlert(titleField.parentElement, "A course with the same title and author already exists.")
        } else {
            cleanAlert(titleField.parentElement)
        }
    }

    // Update form validity and button state
    isFormValid = authorValue && titleValue && !exists // Ensure it does not exist
    updateSubmitButtonState()
}

// Validate name format
function verifyName(string) {
    const regex = /^[^\d]*$/
    const isFieldValid = regex.test(string)
    return validyField(isFieldValid, "The author field is required and cannot contain digits")
}

// Show alert message
function showAlert(reference, mensaje) {
    cleanAlert(reference);
    const error = document.createElement("P")
    error.textContent = mensaje;
    error.classList.add("error-message")
    reference.appendChild(error)
}

// Clean alert messages
function cleanAlert(reference) {
    const alert = reference.querySelector(".error-message")
    if (alert) {
        alert.remove()
    }
}

// Validate field status
function validyField(boolean, text) {
    return boolean ? { isValid: true, message: "" } : { isValid: false, message: text }
}

// Reset form data
function resetData() {
    authorField.value = ""
    titleField.value = ""
    preview.src = "" // Clear the image preview
    preview.style.display = "none";
    cleanAlert(authorField.parentElement)
    cleanAlert(titleField.parentElement)
}

// Image handling
dropZone.addEventListener("click", () => imageInput.click())
dropZone.addEventListener("dragover", (e) => {
    e.preventDefault();
    dropZone.classList.add("dragover")
});
dropZone.addEventListener("dragleave", () => dropZone.classList.remove("dragover"))
dropZone.addEventListener("drop", handleDrop)
imageInput.addEventListener("change", handleFile)

// Handle file selection
function handleFile() {
    const file = imageInput.files[0];
    if (file && file.type.startsWith("image/")) displayImage(file)
}

// Handle file drop
function handleDrop(e) {
    e.preventDefault()
    dropZone.classList.remove("dragover")
    const file = e.dataTransfer.files[0]
    if (file && file.type.startsWith("image/")) displayImage(file)
}

// Display the selected or dropped image
function displayImage(file) {
    const reader = new FileReader()
    reader.onload = function(e) {
        const base64Image = e.target.result

        if (base64Image.length > 500 * 1024) {
            showAlert(dropZone, "The image is too large. Please choose an image smaller than 500KB.");
            preview.style.display = "none" // Hide the preview
        } else {
            preview.src = base64Image;
            preview.style.display = "block" // Show the preview
            cleanAlert(dropZone) // Clear previous alerts
        }
    };
    reader.readAsDataURL(file)
}

// Update the submit button state
function updateSubmitButtonState() {
    submitBtn.disabled = !isFormValid
}
