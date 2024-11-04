let db
const cart = document.querySelector("#carrito")
let cartItems = []
const urlParams = new URLSearchParams(window.location.search)
const courseId = urlParams.get("id")


function initDB() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open("Cursos", 3)
        
        request.onsuccess = function(e) {
            db = e.target.result // Assign the database to the global variable
            console.log("Connection established")
            resolve()
        }

        request.onerror = function(e) {
            console.error("Error connecting to the database", e.target.error)
            reject(e.target.error)
        }
    })
}

function getCourseDetails(courseId) {
    const transaction = db.transaction(["cursos"], "readonly")
    const objectStore = transaction.objectStore("cursos")
    
    const request = objectStore.get(Number(courseId)) // Ensure the ID is a number
    
    request.onsuccess = function(e) {
        const courseData = e.target.result
        if (courseData) {
            document.querySelector(".course-details h3").textContent = courseData.nombre
            document.querySelector(".course-instructor").textContent = `Instructor: ${courseData.instructor}`
            document.querySelector(".course-details strong").textContent = `Precio: ${1} €`
            document.querySelector(".course-image").src = courseData.imagen ? courseData.imagen : `img/curso${courseData.id}.jpg`
        } else {
            console.log("Course not found")
            alert("Course not found.")
        }
    }

    request.onerror = function(e) {
        console.error("Error obtaining course:", e.target.error)
    }
}

function loadCartItems() {
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(["carrito"], "readonly")
        const objectStore = transaction.objectStore("carrito")
        const request = objectStore.getAll()

        request.onsuccess = function() {
            cartItems = request.result.map(item => ({
                ...item,
                quantity: item.quantity || 1 // Ensure all items have a quantity
            }))
            renderCart() // Update the cart view here
            resolve(cartItems)
        }

        request.onerror = function(e) {
            console.error("Error loading cart items:", e.target.error)
            reject(e.target.error)
        }
    })
}

document.addEventListener("DOMContentLoaded", () => {
    initDB()
        .then(() => loadCartItems()) // Load cart items
        .then(() => {
            if (courseId) {
                getCourseDetails(courseId) // Get course details by ID
                const buyButton = document.querySelector(".agregar-carrito")
                buyButton.addEventListener("click", () => addToCart(courseId))
            } else {
                console.log("Course ID not provided")
                alert("Course ID not provided.")
            }
        })
        .catch((error) => {
            console.error("Error initializing the database:", error)
        })
})

// Set up the button to empty the cart
const removeCartButton = document.querySelector("#vaciar-carrito")
removeCartButton.addEventListener("click", removeContentFromCart)


function getCourse(courseId) {
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(["cursos"], "readwrite")
        const objectStore = transaction.objectStore("cursos")

        const request = objectStore.get(Number(courseId))

        request.onsuccess = () => {
            if (request.result) {
                console.log("Course found", request.result)
                resolve(request.result) // Resolve the promise with the found course
            } else {
                console.log(`No course found with ID ${courseId}`)
                resolve(null) // Resolve with null if the course was not found
            }
        }

        request.onerror = () => {
            console.error("Error obtaining course")
            reject("Error obtaining course") // Reject the promise in case of error
        }
    })
}

function addToCart(courseId) {
    getCourse(courseId) // Get the course from the database
        .then(course => {
            if (!course) {
                console.error("Course not found")
                return // Exit if the course is not found
            }

            const id = course.id // The course ID
            const name = course.nombre // Ensure 'nombre' is the correct property
            const price = parseFloat(course.precio) // Convert the price to a number
            const image = `img/curso${id}.jpg` // Assuming the image follows the same pattern

            const cartItem = {
                id,
                image,
                name,
                price,
                quantity: 1
            }

            const existingItemIndex = cartItems.findIndex(item => item.id === id)
            if (existingItemIndex !== -1) {
                cartItems[existingItemIndex].quantity += 1 // Increment the quantity
                addToCarritoStore(cartItems[existingItemIndex]) // Update the item in IndexedDB
                console.log(`Quantity increased for item with ID ${id}: now ${cartItems[existingItemIndex].quantity}`)
            } else {
                cartItems.push(cartItem)
                addToCarritoStore(cartItem) // Add the new course to IndexedDB
                console.log(`Item with ID ${id} added to the cart.`)
            }

            renderCart() // Update the cart view
            toggleCartVisibility(true) // Show the cart
        })
        .catch(error => {
            console.error("Error obtaining the course:", error)
        })
}

function renderCart() {
    const table = cart.querySelector("table tbody")

    table.innerHTML = ''

    cartItems.forEach(item => {
        const newRow = document.createElement("tr")
        newRow.classList.add("element", item.name.replaceAll(" ", ""))

        const elementImage = document.createElement("td")
        const imageFrame = document.createElement("img")
        imageFrame.src = item.image
        imageFrame.classList.add("imagen-curso", "u-full-width")
        elementImage.appendChild(imageFrame)
        newRow.appendChild(elementImage)

        const elementName = document.createElement("td")
        elementName.style.verticalAlign = "middle"
        const nameP = document.createElement("p")
        nameP.style.margin = "0"
        nameP.textContent = item.name
        elementName.appendChild(nameP)
        newRow.appendChild(elementName)

        const elementPrice = document.createElement("td")
        elementPrice.style.verticalAlign = "middle"
        const priceP = document.createElement("p")
        priceP.style.margin = "0"
        priceP.textContent = item.price
        elementPrice.appendChild(priceP)
        newRow.appendChild(elementPrice)

        const elementAmount = document.createElement("td")
        elementAmount.style.verticalAlign = "middle"
        const amountP = document.createElement("p")
        amountP.style.margin = "0"
        amountP.textContent = item.quantity
        elementAmount.appendChild(amountP)
        newRow.appendChild(elementAmount)

        const elementTdX = createDeleteButton(item.id)
        newRow.appendChild(elementTdX)

        table.appendChild(newRow)
    })
}

function addToCarritoStore(item) {
    const transaction = db.transaction(["carrito"], "readwrite")
    const objectStore = transaction.objectStore("carrito")

    const request = objectStore.get(item.id)
    
    request.onsuccess = function(e) {
        const existingItem = e.target.result
        if (existingItem) {
            existingItem.quantity += 1 // Increment by 1 for every addition
            objectStore.put(existingItem).onsuccess = function() {
                console.log(`Quantity updated for item with ID ${item.id}: now ${existingItem.quantity}`)
            }
        } else {
            item.quantity = 1 // Default quantity for new items
            objectStore.add(item).onsuccess = function() {
                console.log(`Item with ID ${item.id} added to cart`)
            }
        }
    }

    request.onerror = function(e) {
        console.error("Error accessing Object Store:", e.target.error)
    }
}

function removeItemFromCart(id) {
    cartItems = cartItems.filter(cartItem => cartItem.id !== id)

    const transaction = db.transaction(["carrito"], "readwrite")
    const objectStore = transaction.objectStore("carrito")

    const request = objectStore.delete(id)
    
    request.onsuccess = function() {
        console.log(`Item with ID ${id} has been removed from the cart`)
        renderCart() // Update the cart view
    }

    request.onerror = function(e) {
        console.error("Error removing the item from the cart:", e.target.error)
    }
}

function removeContentFromCart() {
    // Clear cart array and indexedDB
    cartItems = []
    const transaction = db.transaction(["carrito"], "readwrite")
    const objectStore = transaction.objectStore("carrito")
    objectStore.clear()

    renderCart()
    toggleCartVisibility(false) // Hide cart after clearing
}

function toggleCartVisibility(visible) {
    if (visible) {
        cart.classList.add('visible') // Show the cart
        setTimeout(() => {
            cart.classList.remove('visible') // Hide the cart after a time
        }, 1000)
    }
}

/** 
 * Create a button for the elimination of an item
 */
function createDeleteButton(id) {
    const elementTdX = document.createElement("td")
    const elementX = document.createElement("p")
    elementX.textContent = "X"
    elementX.style.margin = "0"

    elementX.classList.add("borrar-curso")

    // Add an event to delete the item from the cart/database
    elementX.addEventListener("click", () => {
        removeItemFromCart(id)
    })

    elementTdX.appendChild(elementX)
    return elementTdX
}

function buscarCursos(query) {
    const transaction = db.transaction(["cursos"], "readonly")
    const objectStore = transaction.objectStore("cursos")
    const index = objectStore.index("nombre")

    const resultados = []

    index.openCursor().onsuccess = (e) => {
        const cursor = e.target.result

        if (cursor) {
            // Check if the name is in the query
            if (cursor.value.nombre.toLowerCase().includes(query)) {
                resultados.push(cursor.value)
            }
            cursor.continue() // Pass to the next cursor
        } else {
            mostrarResultados(resultados)
        }
    }
}

function mostrarResultados(resultados) {
    const contenedorResultados = document.querySelector("#resultados-autocompletado")
    contenedorResultados.innerHTML = ""

    if (resultados.length === 0) {
        contenedorResultados.style.display = "none"
        return
    }

    resultados.forEach((curso) => {
        const resultadoItem = document.createElement("div")
        resultadoItem.classList.add("resultado-item")
        const imagenSrc = curso.imagen ? curso.imagen : `img/curso${curso.id}.jpg`

        // Add image and text
        resultadoItem.innerHTML = `
            <img src="${imagenSrc}" class="resultado-imagen" />
            <span class="texto">${curso.nombre}</span>
        `

        // Add event to redirect to the course details page
        resultadoItem.addEventListener("click", () => {
            location.href = `course-details.html?id=${curso.id}` // Change the details passing the id in the location
        })

        contenedorResultados.appendChild(resultadoItem)
    })

    contenedorResultados.style.display = "block"
}

document.querySelector("#buscador").addEventListener("input", function () {
    const query = this.value.toLowerCase() // Get the text in lowercase
    if (query.length === 0) {
        document.querySelector("#resultados-autocompletado").style.display = "none" // Hide results
        return
    }

    buscarCursos(query)
})
