// API Base URL (relative as we serve from same origin)
const API_BASE = '/api';

// DOM Elements
const form = document.getElementById('record-form');
const weightInput = document.getElementById('weight');
const sysInput = document.getElementById('systolic');
const diaInput = document.getElementById('diastolic');
const weightSuggestions = document.getElementById('weight-suggestions');
const bpSuggestions = document.getElementById('bp-suggestions');
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

        // Pre-fill fields? Request says "Previous value appears in input form candidate" 
        // usually means placeholder or suggestions. User said "①前回の入力値が入力フォームの候補に出る" 
        // implies suggestions, but let's also pre-fill the inputs as a starting point 
        // or just placeholder. Let's set the value to be helpful.
        weightInput.value = data.weight;
        sysInput.value = data.systolic;
        diaInput.value = data.diastolic;

        generateWeightSuggestions(data.weight);
        generateBPSuggestions(data.systolic, data.diastolic);

    } catch (e) {
        console.error('Error loading latest:', e);
    }
}

function generateWeightSuggestions(baseWeight) {
    weightSuggestions.innerHTML = '';
    // +/- 1kg, 0.2kg steps.
    // Range: -1.0 to +1.0
    const steps = [];
    for (let i = -1.0; i <= 1.05; i += 0.2) { // 1.05 to handle float precision
        steps.push(i);
    }

    steps.forEach(step => {
        // Fix float precision
        const val = Math.round((baseWeight + step) * 10) / 10;
        // Don't show negative weights if base is small (unlikely for adult)
        if (val <= 0) return;

        createChip(weightSuggestions, `${val.toFixed(1)}`, () => {
            weightInput.value = val.toFixed(1);
        }, val.toFixed(1) == baseWeight.toFixed(1));
    });
}

function generateBPSuggestions(baseSys, baseDia) {
    bpSuggestions.innerHTML = '';
    // +/- 10, 2 steps
    const steps = [];
    for (let i = -10; i <= 10; i += 2) {
        steps.push(i);
    }

    steps.forEach(step => {
        const s = Math.round(baseSys + step);
        const d = Math.round(baseDia + step); // Heuristic: apply same delta? 
        // Actually user said "BP ... candidates display +/- 10 ...". 
        // It's ambiguous if they want separate suggestions for Sys/Dia or combined.
        // Usually they move together or user wants to pick Sys then Dia.
        // "combined" is harder to guess.
        // Let's assume the "Candidate" sets BOTH if clicked? 
        // That might be annoying if only one changed.

        // BETTER UX: Create suggestions for "Sys / Dia" pairs? 
        // Or maybe just generic chips like "+2", "+4", "-2" that apply to usage?
        // User text: "前回の入力値のプラスマイナス10までの値が2きざみで入力候補として表示される"
        // "Values up to +/- 10 from previous input displayed as candidates"

        // Let's try listing pairs: "120/80", "122/82"... assuming they shift together?
        // Or just list Sys values?
        // Let's try listing Copouples (Sys/Dia) assuming they drift similarly, 
        // BUT allow editing.
        // If I render pairs, it might be too many if we permute.
        // If I render just Sys values, Dia is left alone.

        // Let's implement: Chips show "Sys / Dia" (e.g. "120/80") 
        // where Sys varies by +/-10 and Dia varies by same amount (heuristic)
        // OR just vary Sys?

        // Let's assume the user wants to pick the 'Set'.
        // Let's create chips for S: -10...10, and keep D constant (or same delta).
        // Let's try same delta for both.

        const label = `${s}/${d}`;
        createChip(bpSuggestions, label, () => {
            sysInput.value = s;
            diaInput.value = d;
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
            loadLatestAndSuggestions(); // This will regenerate suggestions based on new "latest"
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
    // Slice data. allEntries is Newest -> Oldest. 
    // We want the last N entries, so take top N.
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
