// API Base URL (relative as we serve from same origin)
const API_BASE = '/api';

// DOM Elements
const form = document.getElementById('record-form');
const weightInput = document.getElementById('weight');
const sysInput = document.getElementById('systolic');
const diaInput = document.getElementById('diastolic');
const weightSuggestions = document.getElementById('weight-suggestions');
const sysSuggestions = document.getElementById('sysSuggestions');
const diaSuggestions = document.getElementById('diaSuggestions');
const chartCanvas = document.getElementById('historyChart');
const periodSelect = document.getElementById('chart-period');
const toast = document.getElementById('toast');
const dateDisplay = document.getElementById('current-date');

// State
let chartInstance = null;
let allEntries = [];

// Initialize
async function init() {
    // Set Date
    const now = new Date();
    dateDisplay.textContent = now.toLocaleDateString('ja-JP', {
        year: 'numeric', month: 'long', day: 'numeric', weekday: 'short'
    });

    await loadLatestAndSuggestions();
    await loadHistoryAndChart();
}

// Fetch Latest & Generate Suggestions
async function loadLatestAndSuggestions() {
    try {
        const response = await fetch(`${API_BASE}/latest`);
        if (!response.ok) {
            // First run or no data
            return;
        }
        const data = await response.json();

        weightInput.value = data.weight;
        sysInput.value = data.systolic;
        diaInput.value = data.diastolic;

        generateWeightSuggestions(data.weight);
        generateBPSuggestions(sysSuggestions, sysInput, data.systolic);
        generateBPSuggestions(diaSuggestions, diaInput, data.diastolic);

    } catch (e) {
        console.error('Error loading latest:', e);
    }
}

function generateWeightSuggestions(baseWeight) {
    weightSuggestions.innerHTML = '';
    // +/- 1kg, 0.2kg steps.
    const steps = [];
    for (let i = -1.0; i <= 1.05; i += 0.2) {
        steps.push(i);
    }

    steps.forEach(step => {
        // Fix float precision
        const val = Math.round((baseWeight + step) * 10) / 10;
        if (val <= 0) return;

        createChip(weightSuggestions, `${val.toFixed(1)}`, () => {
            weightInput.value = val.toFixed(1);
        }, val.toFixed(1) == baseWeight.toFixed(1));
    });
}

function generateBPSuggestions(container, inputElement, baseValue) {
    if (!container) return;

    container.innerHTML = '';
    // +/- 10, 2 steps
    const steps = [];
    for (let i = -10; i <= 10; i += 2) {
        steps.push(i);
    }

    steps.forEach(step => {
        const val = Math.round(baseValue + step);
        if (val <= 0) return;

        createChip(container, `${val}`, () => {
            inputElement.value = val;
        }, step === 0);
    });
}

function createChip(container, text, onClick, isActive = false) {
    const chip = document.createElement('div');
    chip.className = 'chip';
    if (isActive) chip.classList.add('active');
    chip.textContent = text;
    chip.onclick = (e) => {
        // Remove active from siblings
        Array.from(container.children).forEach(c => c.classList.remove('active'));
        chip.classList.add('active');
        onClick();
    };
    container.appendChild(chip);
}

// Form Submit
form.onsubmit = async (e) => {
    e.preventDefault();

    const data = {
        weight: parseFloat(weightInput.value),
        systolic: parseInt(sysInput.value),
        diastolic: parseInt(diaInput.value)
    };

    try {
        const res = await fetch(`${API_BASE}/entries`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });

        if (res.ok) {
            showToast();
            // Refresh chart and suggestions (new base)
            loadHistoryAndChart();
            loadLatestAndSuggestions();
        } else {
            alert('Failed to save');
        }
    } catch (err) {
        console.error(err);
        alert('Error saving');
    }
};

function showToast() {
    toast.classList.remove('hidden');
    setTimeout(() => {
        toast.classList.add('hidden');
    }, 3000);
}

// Chart
async function loadHistoryAndChart() {
    try {
        const res = await fetch(`${API_BASE}/entries`);
        if (!res.ok) return;
        allEntries = await res.json(); // Ordered newest first

        renderChart();
    } catch (e) {
        console.error(e);
    }
}

periodSelect.onchange = () => {
    renderChart();
};

function renderChart() {
    if (!allEntries.length) return;

    const limit = parseInt(periodSelect.value);
    const dataSlice = allEntries.slice(0, limit).reverse(); // Reverse to Chronological for Chart

    const labels = dataSlice.map(e => {
        const d = new Date(e.date);
        return `${d.getMonth() + 1}/${d.getDate()}`;
    });
    const weights = dataSlice.map(e => e.weight);
    const sys = dataSlice.map(e => e.systolic);
    const dia = dataSlice.map(e => e.diastolic);

    if (chartInstance) {
        chartInstance.destroy();
    }

    const ctx = chartCanvas.getContext('2d');
    chartInstance = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [
                {
                    label: 'Weight (kg)',
                    data: weights,
                    borderColor: '#4F46E5', // Indigo
                    backgroundColor: 'rgba(79, 70, 229, 0.1)',
                    yAxisID: 'y',
                    tension: 0.3
                },
                {
                    label: 'Systolic',
                    data: sys,
                    borderColor: '#EF4444', // Red
                    backgroundColor: 'rgba(239, 68, 68, 0.1)',
                    yAxisID: 'y1',
                    tension: 0.3
                },
                {
                    label: 'Diastolic',
                    data: dia,
                    borderColor: '#F59E0B', // Amber
                    backgroundColor: 'rgba(245, 158, 11, 0.1)',
                    yAxisID: 'y1',
                    tension: 0.3
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: {
                mode: 'index',
                intersect: false,
            },
            scales: {
                y: {
                    type: 'linear',
                    display: true,
                    position: 'left',
                    title: { display: true, text: 'Weight (kg)' }
                },
                y1: {
                    type: 'linear',
                    display: true,
                    position: 'right',
                    grid: {
                        drawOnChartArea: false, // only want the grid lines for one axis
                    },
                    title: { display: true, text: 'BP (mmHg)' }
                }
            }
        }
    });
}

// Start
init();
