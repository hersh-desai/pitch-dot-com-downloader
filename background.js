// background.js
import { jsPDF } from 'jspdf';

let images = [];
let totalSlides = 0;
let currentSlide = 0;
let currentTabId = null;

chrome.action.onClicked.addListener((tab) => {
  console.log('Extension icon clicked');
  images = [];
  currentSlide = 0;
  currentTabId = tab.id;

  // Inject content script
  chrome.scripting.executeScript(
    {
      target: { tabId: tab.id },
      files: ['content.js'],
    },
    () => {
      console.log('Content script injected');
      // Start the process
      chrome.tabs.sendMessage(tab.id, { action: 'getTotalSlides' });
    }
  );
});

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'totalSlides') {
    totalSlides = request.totalSlides;
    console.log(`Total slides: ${totalSlides}`);
    captureSlide();
  } else if (request.action === 'slideReady') {
    // Wait at least 1000ms before capturing the slide
    setTimeout(() => {
      updateProgressNotification(currentSlide + 1, totalSlides);

      captureVisibleTabWithRetry(sender.tab.id, sender.tab.windowId)
        .then((dataUrl) => {
          images.push(dataUrl);
          console.log(`Captured slide ${currentSlide + 1}`);

          if (currentSlide < totalSlides - 1) {
            currentSlide++;
            // Move to next slide
            chrome.tabs.sendMessage(sender.tab.id, { action: 'nextSlide' });
          } else {
            // All slides captured
            console.log('All slides captured, creating PDF...');
            createPDF();
          }
        })
        .catch((error) => {
          console.error('Capture failed:', error);
          // Optionally, notify the user and abort the process
          chrome.notifications.create('error', {
            type: 'basic',
            iconUrl: chrome.runtime.getURL('icon.png'),
            title: 'Pitch to PDF',
            message: 'Failed to capture slide. Please try again.',
          });
        });
    }, 1000); // Delay increased to 1000ms
  }
});

function captureSlide() {
  console.log('Preparing to capture slide...');
  chrome.tabs.sendMessage(currentTabId, { action: 'prepareSlide' });
}

function createPDF() {
    let doc = new jsPDF('landscape');
  
    images.forEach((imgData, index) => {
      if (!imgData) {
        console.error(`Image data at index ${index} is invalid.`);
        // Skip invalid image data
        return;
      }
  
      if (index > 0) {
        doc.addPage();
      }
  
      let pageWidth = doc.internal.pageSize.getWidth();
      let pageHeight = doc.internal.pageSize.getHeight();
  
      // Add the image directly to the PDF
      doc.addImage(imgData, 'PNG', 0, 0, pageWidth, pageHeight);
    });
  
    // Get the PDF as an ArrayBuffer
    let pdfArrayBuffer = doc.output('arraybuffer');
  
    // Convert the ArrayBuffer to a Blob
    let pdfBlob = new Blob([pdfArrayBuffer], { type: 'application/pdf' });
  
    // Use FileReader to read the Blob as a data URL
    let reader = new FileReader();
    reader.onload = function() {
      let pdfDataUrl = reader.result; // This will be the data URL
  
      // Now use chrome.downloads.download to save the PDF
      chrome.downloads.download({
        url: pdfDataUrl,
        filename: 'pitch-presentation.pdf',
        saveAs: true
      }, function(downloadId) {
        if (chrome.runtime.lastError) {
          console.error('Download failed:', chrome.runtime.lastError);
        } else {
          console.log('PDF download started with downloadId:', downloadId);
  
          console.log('PDF created and saved as pitch-presentation.pdf');
  
          chrome.notifications.clear('progress');
          chrome.notifications.create('complete', {
            type: 'basic',
            iconUrl: chrome.runtime.getURL('icon.png'),
            title: 'Pitch to PDF',
            message: 'PDF creation complete!',
          });
        }
      });
    };
  
    reader.onerror = function(error) {
      console.error('Failed to read PDF Blob as data URL:', error);
    };
  
    reader.readAsDataURL(pdfBlob);
  }

function updateProgressNotification(current, total) {
  chrome.notifications.create('progress', {
    type: 'basic',
    iconUrl: chrome.runtime.getURL('icon.png'),
    title: 'Pitch to PDF',
    message: `Capturing slide ${current} of ${total}...`,
    priority: 1,
  });
}

function captureVisibleTabWithRetry(tabId, windowId, retries = 3) {
  return new Promise((resolve, reject) => {
    function attemptCapture(attemptsLeft) {
      chrome.tabs.captureVisibleTab(
        windowId,
        { format: 'png' },
        (dataUrl) => {
          if (chrome.runtime.lastError || !dataUrl) {
            console.warn(`Capture failed: ${chrome.runtime.lastError?.message || 'Unknown error'}`);
            if (attemptsLeft > 0) {
              console.log(`Retrying capture... Attempts left: ${attemptsLeft - 1}`);
              setTimeout(() => {
                attemptCapture(attemptsLeft - 1);
              }, 1000); // Wait 1 second before retrying
            } else {
              console.error('Failed to capture tab after retries.');
              reject(chrome.runtime.lastError);
            }
          } else {
            resolve(dataUrl);
          }
        }
      );
    }

    attemptCapture(retries);
  });
}