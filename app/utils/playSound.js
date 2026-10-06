const SOUND_SETS = {
    complete: [
        "/sounds/complete/Boom that one Finnaly off the list.mp3",
        "/sounds/complete/Done n Dusted Beautifully.mp3",
        "/sounds/complete/Finally! I was beginning to get emotionally attached to that task.mp3",
        "/sounds/complete/My My Someone Just Executed That Task.mp3",
        "/sounds/complete/Nice work. You can breathe a little easier now.mp3",
        "/sounds/complete/there it is, another small win for today.mp3",
        "/sounds/complete/well well well... someone actually finished their task.mp3",
    ],

    overdue: [
        "/sounds/overdue/Amazing! Your Task Timer Died Just now.mp3",
        "/sounds/overdue/I think your task is starting to feel a little neglected.mp3",
        "/sounds/overdue/Wow You failed So nicely.mp3",
        "/sounds/overdue/Just a quick interruption, your deadline has already passed.mp3",
        "/sounds/overdue/Looks like the deadline came and went without you.mp3",
        "/sounds/overdue/Your deadline just passed. I’m not judging... much.mp3",
        "/sounds/overdue/Your task just entered overdue mode.mp3",
    ],
};


export function playSound(src) {
    try {
        const audio = new Audio(src);
        audio.play().catch((err) => {
            console.warn("Sound playback blocked:", err.message);
        });
    } catch (err) {
        console.error("Failed to play sound:", err);
    }
}


export function playRandomSound(setName) {
    const options = SOUND_SETS[setName];
    if (!options || options.length === 0) {
        console.warn(`No sounds registered for set: ${setName}`);
        return;
    }
    const randomIndex = Math.floor(Math.random() * options.length);
    playSound(options[randomIndex]);
}