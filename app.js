// Paste your Firebase configuration object here.
const firebaseConfig = {
    apiKey: "AIzaSyDBhY2Xc4ZIW8HIeDOfJLY1JhKWq_qoUz4",
    authDomain: "irving-luna.github.io",
    projectId: "love-paws-4d65a",
    storageBucket: "love-paws-4d65a.firebasestorage.app",
    messagingSenderId: "1051316934921",
    appId: "1:1051316934921:web:37a13500ac55617a029bd8",
    measurementId: "G-2H8T48RRZ3"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();

// State
let currentClientId = null;
let currentPetId = null;

// DOM Elements
const loginView = document.getElementById('login-view');
const userView = document.getElementById('user-view');
const appContainer = document.getElementById('app-container');
const userEmailDisplay = document.getElementById('user-email');
const loginForm = document.getElementById('login-form');
const logoutButton = document.getElementById('logout-button');

const clientSearchForm = document.getElementById('client-search-form');
const clientSearchPhoneInput = document.getElementById('client-search-phone');
const clientInfoDiv = document.getElementById('client-info');
const clientNameDisplay = document.getElementById('client-name-display');

const newClientFormContainer = document.getElementById('new-client-form-container');
const addClientForm = document.getElementById('add-client-form');
const newClientNameInput = document.getElementById('new-client-name');
const newClientPhoneInput = document.getElementById('new-client-phone');

const petSection = document.getElementById('pet-section');
const addPetForm = document.getElementById('add-pet-form');
const petNameInput = document.getElementById('pet-name');
const petBreedInput = document.getElementById('pet-breed');
const petsListDiv = document.getElementById('pets-list');

const serviceSection = document.getElementById('service-section');
const selectedPetNameH2 = document.getElementById('selected-pet-name');
const serviceCountSpan = document.getElementById('service-count');
const addServiceForm = document.getElementById('add-service-form');
const serviceNameInput = document.getElementById('service-name');
const servicesListUl = document.getElementById('services-list');

// --- AUTHENTICATION ---
auth.onAuthStateChanged(user => {
    if (user) {
        // User is signed in
        userEmailDisplay.textContent = user.email;
        loginView.classList.add('hidden');
        userView.classList.remove('hidden');
        appContainer.classList.remove('hidden');
    } else {
        // User is signed out
        loginView.classList.remove('hidden');
        userView.classList.add('hidden');
        appContainer.classList.add('hidden');
        resetToInitialState();
    }
});

loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;
    try {
        await auth.signInWithEmailAndPassword(email, password);
    } catch (error) {
        alert(error.message);
    }
});

logoutButton.addEventListener('click', () => {
    auth.signOut();
});

// --- CLIENT LOGIC ---
clientSearchForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const phoneNumber = clientSearchPhoneInput.value.trim();
    if (!phoneNumber) return;

    resetClientAndPetState();

    const clientsRef = db.collection('clients');
    const q = clientsRef.where('phone', '==', phoneNumber);
    
    try {
        const querySnapshot = await q.get();
        if (querySnapshot.empty) {
            newClientFormContainer.classList.remove('hidden');
            newClientPhoneInput.value = phoneNumber;
            clientSearchPhoneInput.disabled = true;
            newClientPhoneInput.disabled = true;
            clientInfoDiv.classList.add('hidden');
        } else {
            clientSearchPhoneInput.disabled = true;
            const clientDoc = querySnapshot.docs[0];
            currentClientId = clientDoc.id;
            displayClientInfo(clientDoc.data());
            await displayPets(currentClientId);
        }
    } catch (error) {
        console.error("Error searching for client:", error);
        alert("No se pudo buscar cliente.");
    }
});

addClientForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = newClientNameInput.value.trim();
    const phone = newClientPhoneInput.value.trim();
    if (!name || !phone) return;

    try {
        const docRef = await db.collection('clients').add({ name, phone });
        currentClientId = docRef.id;
        displayClientInfo({ name, phone });
        newClientFormContainer.classList.add('hidden');
        await displayPets(currentClientId);
    } catch (error) {
        console.error("Error adding client:", error);
        alert("No se pudo agregar cliente.");
    }
});

function displayClientInfo(clientData) {
    clientNameDisplay.textContent = `Cliente: ${clientData.name}`;
    clientInfoDiv.classList.remove('hidden');
    petSection.classList.remove('hidden');
    petSection.scrollIntoView({ behavior: 'smooth' });
}

// --- PET LOGIC ---
addPetForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!currentClientId) return;

    const petName = petNameInput.value.trim();
    const petBreed = petBreedInput.value.trim();
    
    if (!petName || !petBreed) return;

    try {
        await db.collection('pets').add({
            name: petName,
            breed: petBreed,
            clientId: currentClientId,
        });
        await db.collection('clients').doc(currentClientId).update({
            clientId: currentClientId
        });
        addPetForm.reset();
        await displayPets(currentClientId);
    } catch (error) {
        console.error("Error adding pet:", error);
        alert("No se pudo agregar mascota.");
    }
});

async function displayPets(clientId) {
    petsListDiv.innerHTML = '';
    const petsRef = db.collection('pets');
    const q = petsRef.where('clientId', '==', clientId);

    try {
        const querySnapshot = await q.get();
        querySnapshot.forEach(doc => {
            const pet = doc.data();
            const petEl = document.createElement('div');
            petEl.classList.add('pet-item');
            petEl.textContent = `${pet.name} (${pet.breed})`;
            petEl.dataset.petId = doc.id;
            petEl.addEventListener('click', () => handlePetSelection(doc.id, pet.name));
            petsListDiv.appendChild(petEl);
        });
    } catch (error) {
        console.error("Error getting pets:", error);
    }
}

function handlePetSelection(petId, petName) {
    currentPetId = petId;
    
    // Update UI for selected pet
    document.querySelectorAll('.pet-item').forEach(el => el.classList.remove('selected'));
    document.querySelector(`[data-pet-id="${petId}"]`).classList.add('selected');

    serviceSection.classList.remove('hidden');
    selectedPetNameH2.textContent = `Servicios para ${petName}`;
    displayServices(petId);
}

// --- SERVICE LOGIC ---
addServiceForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!currentPetId) return;

    const serviceName = serviceNameInput.value.trim();
    const phoneNumber = clientSearchPhoneInput.value.trim();
    if (!serviceName) return;

    try {
        await db.collection('services').add({
            name: serviceName,
            petId: currentPetId,
            phoneNumber: phoneNumber,
            date: firebase.firestore.FieldValue.serverTimestamp()
        });
        addServiceForm.reset();
        await displayServices(currentPetId);
    } catch (error) {
        console.error("Error adding service:", error);
        alert("No se pudo agregar servicio.");
    }
});

async function displayServices(petId) {
    serviceSection.scrollIntoView({ behavior: 'smooth' });
    servicesListUl.innerHTML = '';
    const servicesRef = db.collection('services');
    const q = servicesRef.where('petId', '==', petId).orderBy('date', 'desc');

    try {
        const querySnapshot = await q.get();
        serviceCountSpan.textContent = querySnapshot.size;
        querySnapshot.forEach(doc => {
            const service = doc.data();
            const li = document.createElement('li');
            const serviceDate = service.date ? service.date.toDate().toLocaleDateString() : 'N/A';
            li.textContent = `${service.name} - ${serviceDate}`;
            servicesListUl.appendChild(li);
        });
    } catch (error) {
        console.error("Error obteniendo servicios.", error);
    }
}

// --- UTILITY FUNCTIONS ---
function resetClientAndPetState() {
    currentClientId = null;
    currentPetId = null;
    clientInfoDiv.classList.add('hidden');
    newClientFormContainer.classList.add('hidden');
    petSection.classList.add('hidden');
    serviceSection.classList.add('hidden');
    petsListDiv.innerHTML = '';
    servicesListUl.innerHTML = '';
    serviceCountSpan.textContent = '0';
    clientSearchPhoneInput.disabled = false;
    newClientPhoneInput.disabled = false;
}

function resetToInitialState() {
    resetClientAndPetState();
    clientSearchForm.reset();
    addClientForm.reset();
    addPetForm.reset();
    addServiceForm.reset();
}

