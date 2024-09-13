// content.js
(function() {
  let totalSlides = 0;

  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    console.log('Content script received message:', request.action);
    if (request.action === "getTotalSlides") {
      totalSlides = getTotalSlides();
      chrome.runtime.sendMessage({ action: "totalSlides", totalSlides: totalSlides });
    } else if (request.action === "prepareSlide") {
      // Start checking if the slide is fully revealed
      checkIfSlideFullyRevealed();
    } else if (request.action === "nextSlide") {
      // Advance to the next sub-slide
      advanceToNextSubSlide();
    }
  });

  function getTotalSlides() {
    let total = 0;
    let totalSlidesElement = document.querySelector('.player-v2-chrome-controls-slide-count');
    if (totalSlidesElement) {
      total = parseInt(totalSlidesElement.innerText.split('/')[1].trim()); // Get the total number of slides
      console.log('Total slides found:', total);
    } else {
      alert("Unable to determine the total number of slides.");
    }
    return total;
  }

  function advanceToNextSubSlide() {
    console.log('Advancing to next sub-slide...');
    // Simulate pressing the right arrow key
    let event = new KeyboardEvent('keydown', {
      key: 'ArrowRight',
      code: 'ArrowRight',
      keyCode: 39,
      which: 39,
      bubbles: true,
      cancelable: true
    });
    document.dispatchEvent(event);
    // Wait for the slide transition and then check if the slide is fully revealed
    setTimeout(checkIfSlideFullyRevealed, 500); // Adjust delay as needed
  }

  function checkIfSlideFullyRevealed() {
    let progressBar = document.querySelector('.dash-progress');
    if (progressBar) {
      let style = progressBar.getAttribute('style');
      console.log('Progress bar style:', style);
      if (style && style.includes('width: 100%')) {
        // Slide is fully revealed
        console.log('Slide is fully revealed and ready to capture.');
        chrome.runtime.sendMessage({ action: "slideReady" });
      } else {
        // Slide is not fully revealed, advance to next sub-slide
        console.log('Slide not fully revealed, advancing to next sub-slide...');
        advanceToNextSubSlide();
      }
    } else {
      // If progress bar is not found, assume slide is ready after a delay
      console.log('Progress bar not found, assuming slide is ready after delay.');
      setTimeout(() => {
        chrome.runtime.sendMessage({ action: "slideReady" });
      }, 1000);
    }
  }
})();