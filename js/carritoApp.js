// Selects & Event Listeners

let db
const cart = document.querySelector("#carrito")
// Array para almacenar los artículos del carrito
let cartItems = []


// Set up purchase buttons
const buyButtons = document.querySelectorAll(".agregar-carrito")
buyButtons.forEach((button) => {
    button.addEventListener("click", () => addToCart(button)) // Attach click event
});

// Set up the button to empty the cart
const removeCartButton = document.querySelector("#vaciar-carrito")
removeCartButton.addEventListener("click", removeContentFromCart)

// Initialize database and load items
document.addEventListener("DOMContentLoaded", () => {
    initDB()
        .then(() => loadCartItems()) // Load carts from the database
        .then(() => getAllCourses())  // Return all the courses
        .then((courses) => {
            generateHtmlCourses(courses) // Display the course data
            renderCart() // Render the cart with loaded items
            const buyButtons = document.querySelectorAll(".agregar-carrito")
            buyButtons.forEach((button) => {
                button.addEventListener("click", () => addToCart(button)) // Attach click event for each button
            })
        })
        .catch((error) => {
            console.error("Error al inicializar la base de datos o cargar los cursos:", error)
        })
})

// Search functionality

document.querySelector("#buscador").addEventListener("input", function () {
    const query = this.value.toLowerCase() // Input in lowercase
    if (query.length === 0) {
      document.querySelector(".resultados-autocompletado").style.display = "none" // Hide results if is empty
      return
    }
  
    // Search courses in IndexedDB
    buscarCursos(query);
  });

renderCart()



// CRUD INDEXED DB


function initDB() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open("Cursos", 3)

        request.onupgradeneeded = function(e) {
            const db = e.target.result

            // Optionally delete the object store if it already exists
            if (db.objectStoreNames.contains("cursos")) {
                db.deleteObjectStore("cursos")
            }

            // Create new object store for courses
            const objectStoreCursos = db.createObjectStore("cursos", {
                keyPath: "id",
                autoIncrement: true
            })

            // Create an index for course names
            objectStoreCursos.createIndex("nombre", "nombre", { unique: false });

            // Create object store for the cart
            const objectStoreCarrito = db.createObjectStore("carrito", {
                keyPath: "id",
                autoIncrement: true
            })

            const cursosIniciales = [
                { nombre: 'JavaScript', instructor: 'Manuel R.', precio: 200 },
                { nombre: 'HTML5, CSS3', instructor: 'Alejandro C.', precio: 200 },
                { nombre: 'PHP', instructor: 'Javier O.', precio: 200 },
                { nombre: 'Docker', instructor: 'Javier G.', precio: 200 },
                { nombre: 'Hacking Ético', instructor: 'Manuel R.', precio: 200 },
                { nombre: 'Puesta en Producción Segura', instructor: 'Alejandro C.', precio: 200 },
                { nombre: 'Incidentes de Ciberseguridad', instructor: 'Eduardo F.', precio: 200 },
                { nombre: 'Bastionado de Sistemas y Redes', instructor: 'David R.', precio: 200 },
                { nombre: 'Análisis forense Informático', instructor: 'Manuel R.', precio: 200 }
            ];

            // Add initial courses
            cursosIniciales.forEach(curso => {
                objectStoreCursos.add(curso)
            })
        }

        request.onsuccess = function(e) {
            db = e.target.result // Assign the database to a global variable
            console.log("Conexión realizada")
            resolve()
        }

        request.onerror = function(e) {
            console.error("Error al conectar la base de datos ", e.target.error)
            reject(e.target.error)
        }
    })
}


function getAllCourses() {
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(["cursos"])
        const courseObject = transaction.objectStore("cursos")

        const request = courseObject.getAll()

        request.onsuccess = function() {
            console.log("Cursos devueltos con éxito", request.result)
            resolve(request.result)
        }

        request.onerror = function(e) {
            console.error("Error al obtener todos los cursos:", e.target.error)
            reject(e.target.error)
        }
    })
}

// Cart Management

/**
 * Adds an item to the cart.
 * @param {HTMLElement} item - The purchase button that was clicked.
 */
function addToCart(item) {
    const card = item.parentElement.parentElement // Obtain the course card
    obtainData(card)
        .then(courseData => {
            const id = courseData.id // Get the ID from the course data
            const name = courseData.nombre // Get the name of the course
            const price = courseData.precio // Get the price of the course
            const image = card.querySelector("img").src // Get the image

            const cartItem = {
                id,
                image,
                name,
                price,
                quantity: 1
            }

            // Check if the item already exists in the cart
            const existingItemIndex = cartItems.findIndex(cartItem => cartItem.id === id)

            if (existingItemIndex !== -1) {
                // If the item already exists, increase its quantity
                cartItems[existingItemIndex].quantity += 1

                // Update the quantity in IndexedDB as well
                addToCarritoStore(cartItems[existingItemIndex])
            } else {
                // If the item doesn't exist, add it to the cart
                cartItems.push(cartItem)
                // Add the new course to IndexedDB
                addToCarritoStore(cartItem)
            }

            renderCart() // Update the cart view
            toggleCartVisibility(true) // Show the cart
        })
        .catch(error => {
            console.error("Error obtaining course data:", error)
        })
}



function addToCarritoStore(item) {
    const transaction = db.transaction(["carrito"], "readwrite")
    const objectStore = transaction.objectStore("carrito")

    // Get the existing item
    const request = objectStore.get(item.id)
    
    request.onsuccess = function(e) {
        const existingItem = e.target.result
        if (existingItem) {
            // Increment the quantity if item exists
            existingItem.quantity += 1 // Increment by 1 for every addition
            objectStore.put(existingItem).onsuccess = function() {
                console.log(`Quantity updated for item with ID ${item.id}: now ${existingItem.quantity}`)
            }
        } else {
            // Add new item with quantity 1
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


function obtainData(card) {
    return new Promise((resolve, reject) => {
        const id = card.querySelector("a").getAttribute("data-id")
        
        // Iniciar una transacción para acceder a la object store "cursos"
        const transaction = db.transaction(["cursos"], "readonly")
        const objectStore = transaction.objectStore("cursos")
        
        // Obtener el curso basado en el id
        const request = objectStore.get(Number(id)) // Asegúrate de que el id sea un número

        request.onsuccess = function(e) {
            const courseData = e.target.result
            if (courseData) {
                // Si se encuentra el curso, devolver todos sus datos
                resolve(courseData)
            } else {
                // Si no se encuentra el curso, devolver un error
                reject(new Error(`Curso con ID ${id} no encontrado.`))
            }
        }

        request.onerror = function(e) {
            console.error("Error al obtener el curso: ", e.target.error)
            reject(e.target.error)
        }
    })
}


export function loadCartItems() {
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(["carrito"], "readonly")
        const objectStore = transaction.objectStore("carrito")
        const request = objectStore.getAll()

        request.onsuccess = function() {
            cartItems = request.result.map(item => {
                // Ensure all items have a quantity set correctly
                return { ...item, quantity: item.quantity || 1 }
            })
            resolve(cartItems)
        }

        request.onerror = function(e) {
            console.error("Error al cargar los artículos del carrito:", e.target.error)
            reject(e.target.error)
        }
    })
}

/**
 * Render the content inside a table
 */
export function renderCart() {
    const table = cart.querySelector("table tbody")

    table.innerHTML = ''

    // Go through all the items in the cart and show each item in a row of the table
    cartItems.forEach(item => {
        const newRow = document.createElement("tr");
        newRow.classList.add("element", item.name.replaceAll(" ", ""));

        const elementImage = document.createElement("td");
        const imageFrame = document.createElement("img");
        imageFrame.src = item.image;
        imageFrame.classList.add("imagen-curso", "u-full-width");
        elementImage.appendChild(imageFrame);
        newRow.appendChild(elementImage);

        const elementName = document.createElement("td");
        elementName.style.verticalAlign = "middle";
        const nameP = document.createElement("p");
        nameP.style.margin = "0";
        nameP.textContent = item.name;
        elementName.appendChild(nameP);
        newRow.appendChild(elementName);

        const elementPrice = document.createElement("td");
        elementPrice.style.verticalAlign = "middle";
        const priceP = document.createElement("p");
        priceP.style.margin = "0";
        priceP.textContent = 1;
        elementPrice.appendChild(priceP);
        newRow.appendChild(elementPrice);

        const elementAmount = document.createElement("td");
        elementAmount.style.verticalAlign = "middle";
        const amountP = document.createElement("p");
        amountP.style.margin = "0";
        amountP.textContent = item.quantity;
        elementAmount.appendChild(amountP);
        newRow.appendChild(elementAmount);

        const elementTdX = createDeleteButton(item.id);
        newRow.appendChild(elementTdX);

        table.appendChild(newRow);
    });
}


/** 
 * 
 * Create a button for the elimination of an item
 *
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
    });

    elementTdX.appendChild(elementX)
    return elementTdX
}


function removeItemFromCart(id) {
    // Remove item from cart array and IndexedDB
    cartItems = cartItems.filter(cartItem => cartItem.id !== id)  // Filter out the item

    const transaction = db.transaction(["carrito"], "readwrite")
    const objectStore = transaction.objectStore("carrito")

    const request = objectStore.delete(id)
    
    request.onsuccess = function() {
        console.log(`El artículo con id ${id} ha sido eliminado del carrito`)
        renderCart()
    }

    request.onerror = function(e) {
        console.error("Error al eliminar el artículo del carrito:", e.target.error)
    }
}

function toggleCartVisibility(visible) {
    if (visible) {
        cart.classList.add('visible') // Show the cart
        setTimeout(() => {
            cart.classList.remove('visible') // Hide the cart after a certain time
        }, 1000)
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

function generateHtmlCourses(coursesArray) {
    const contenedorCursos = document.querySelector('#lista-cursos')

    if(contenedorCursos) {
    contenedorCursos.innerHTML = ''
    contenedorCursos.innerHTML += '<h1 id="encabezado" class="encabezado">Ofertas Black Friday</h1>'

    let rowHTML = ''

    coursesArray.forEach((curso, index) => {
        // Verify if the course object has the property imagen
        const imagenSrc = curso.imagen ? curso.imagen : `img/curso${curso.id}.jpg`

        // Create the card for the curse
        const cursoHTML = `
          <div class="four columns">
            <div class="card">
              <img src="${imagenSrc}" class="imagen-curso u-full-width" data-id="${curso.id}" />
              <div class="info-card">
                <h4>${curso.nombre}</h4>
                <p>${curso.instructor}</p>
                <img src="img/estrellas.png" />
                <p class="precio">${curso.precio}€ <span class="u-pull-right">${1}€</span></p>
                <a href="#" class="u-full-width button-primary button input agregar-carrito" data-id="${curso.id}">Añadir al carrito</a>
              </div>
            </div>
          </div>
        `

        // Add the card to the content row
        rowHTML += cursoHTML

        // When 3 courses are added, add the row to the container and reset the row after adding it
        if ((index + 1) % 3 === 0 || index === coursesArray.length - 1) {
            contenedorCursos.innerHTML += `<div class="row">${rowHTML}</div>`
            rowHTML = ''
        }
    })

    // Add event click to the images of the cards
    const images = contenedorCursos.querySelectorAll('.imagen-curso')
    images.forEach(image => {
        image.addEventListener('click', function() {
            const courseId = this.getAttribute('data-id')
            location.href = `course-details.html?id=${courseId}` // Redirect to the page of the course
        })
    })
    }
    
}

// Search bar
  
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




  