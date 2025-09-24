// quick-add.js - Handles the logic for the redesigned quick add pop-up tool.

document.addEventListener('DOMContentLoaded', () => {
    const modeButtons = document.querySelectorAll('.mode-btn');
    const weekdayButtons = document.querySelectorAll('.weekday-btn');
    const weekdayPanel = document.getElementById('weekday-panel');
    const exactDatePanel = document.getElementById('exact-date-panel');
    const datePicker = document.getElementById('event-date-picker');
    const addEventBtn = document.getElementById('add-event-btn');
    const eventTextInput = document.getElementById('event-text');
    const eventPeriodSelect = document.getElementById('event-period');

    let currentMode = 'next-weekday'; // Default mode
    let selectedWeekday = null;

    // Set default date for picker
    datePicker.valueAsDate = new Date();

    // Mode switching logic
    modeButtons.forEach(button => {
        button.addEventListener('click', () => {
            modeButtons.forEach(btn => btn.classList.remove('active'));
            button.classList.add('active');
            currentMode = button.dataset.mode;

            if (currentMode === 'exact-date') {
                weekdayPanel.classList.add('hidden');
                exactDatePanel.classList.remove('hidden');
            } else {
                weekdayPanel.classList.remove('hidden');
                exactDatePanel.classList.add('hidden');
            }
        });
    });

    // Weekday selection logic
    weekdayButtons.forEach(button => {
        button.addEventListener('click', () => {
            weekdayButtons.forEach(btn => btn.classList.remove('active'));
            button.classList.add('active');
            selectedWeekday = parseInt(button.dataset.day);
        });
    });

    // Add event logic
    addEventBtn.addEventListener('click', () => {
        const text = eventTextInput.value.trim();
        if (!text) {
            eventTextInput.focus();
            eventTextInput.style.borderColor = 'red';
            return;
        }
        // Reset border color on successful input
        eventTextInput.style.borderColor = '';
        datePicker.style.borderColor = '';


        let eventDateStr; // The final YYYY-MM-DD date string
        const recurring = currentMode === 'every-weekday';

        if (currentMode === 'next-weekday' || currentMode === 'every-weekday') {
            if (selectedWeekday === null) {
                // No day selected, flash the buttons
                weekdayPanel.animate([ { transform: 'scale(1)' }, { transform: 'scale(1.02)' }, { transform: 'scale(1)' } ], { duration: 300 });
                return;
            }
            
            const today = new Date();
            // Create a date object for today at midnight to avoid timezone issues with `new Date()`
            const eventDate = new Date(today.getFullYear(), today.getMonth(), today.getDate());
            
            const todayDay = eventDate.getDay();
            let dayDifference = selectedWeekday - todayDay;

            if (dayDifference <= 0 && currentMode === 'next-weekday') {
                dayDifference += 7;
            } else if (dayDifference < 0 && currentMode === 'every-weekday') {
                 dayDifference += 7;
            } else if (dayDifference === 0 && currentMode === 'every-weekday') {
                // If "Every Wednesday" and it's Wednesday, start from today
                // No change needed
            } else if (dayDifference === 0 && currentMode === 'next-weekday') {
                // If "Next Wednesday" and it's Wednesday, schedule for next week
                dayDifference += 7;
            }
            eventDate.setDate(eventDate.getDate() + dayDifference);

            // Convert to YYYY-MM-DD string reliably
            const year = eventDate.getFullYear();
            const month = String(eventDate.getMonth() + 1).padStart(2, '0');
            const day = String(eventDate.getDate()).padStart(2, '0');
            eventDateStr = `${year}-${month}-${day}`;

        } else if (currentMode === 'exact-date') {
            // The date picker value is already in 'YYYY-MM-DD' format. No conversion needed.
            if (!datePicker.value) {
                datePicker.style.borderColor = 'red';
                return;
            }
            eventDateStr = datePicker.value;
        }

        const eventData = {
            date: eventDateStr,
            period: eventPeriodSelect.value,
            text: text,
            recurring: recurring
        };

        window.electronAPI.addEvent(eventData);
    });
});
