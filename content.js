// Netflix Intro Skipper - Content Script
class NetflixIntroSkipper {
    constructor() {
        this.observer = null;
        this.skipInterval = null;
        this.isMonitoring = false;
        this.lastSkipTime = 0;
        this.skipCooldown = 2000;
        this.init();
    }

    init() {
        console.log('🎬 Netflix Intro Skipper Extension initialized');
        this.startMonitoring();
    }

    startMonitoring() {
        if (this.isMonitoring) return;
        
        this.isMonitoring = true;
        this.setupObservers();
        this.setupAggressiveInterval();
        this.setupVideoListeners();
        
        console.log('🔍 Extension: Monitoring for intro skip buttons...');
    }

    setupObservers() {
        this.observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
                    this.attemptIntroSkip();
                }
            });
        });

        if (document.body) {
            this.observer.observe(document.body, {
                childList: true,
                subtree: true,
                attributes: true,
                attributeFilter: ['class', 'style', 'data-uia']
            });
        }
    }

    setupAggressiveInterval() {
        this.skipInterval = setInterval(() => {
            this.attemptIntroSkip();
        }, 500);
    }

    setupVideoListeners() {
        const video = document.querySelector('video');
        if (video) {
            video.addEventListener('timeupdate', () => {
                this.attemptIntroSkip();
            });
        }
    }

    attemptIntroSkip() {
        const now = Date.now();
        if (now - this.lastSkipTime < this.skipCooldown) return;
        
        if (this.skipIntro()) {
            this.lastSkipTime = now;
        }
    }

    skipIntro() {
        const strategies = [
            () => this.clickBySelectors([
                '[data-uia="skip-credits"]',
                '.skip-credits',
                '.skip-intro',
                '[aria-label*="Skip"]',
                'button[class*="skip"]',
                'div[class*="skip"]',
                'span[class*="skip"]'
            ]),
            () => this.clickByTextContent(['Skip Intro', 'Skip', 'Skip Credits']),
            () => this.clickByAriaLabel(['Skip Intro', 'Skip Credits']),
            () => this.findAndClickSkipButton()
        ];

        for (const strategy of strategies) {
            if (strategy()) {
                console.log('⏭️ Extension: Intro skipped!');
                return true;
            }
        }
        return false;
    }

    clickBySelectors(selectors) {
        for (const selector of selectors) {
            const elements = document.querySelectorAll(selector);
            for (const element of elements) {
                if (this.isVisibleAndClickable(element)) {
                    console.log(`🎯 Extension: Found intro skip with selector: ${selector}`);
                    element.click();
                    return true;
                }
            }
        }
        return false;
    }

    clickByTextContent(texts) {
        const allElements = document.querySelectorAll('button, div, span, a');
        for (const element of allElements) {
            if (this.isVisibleAndClickable(element)) {
                const elementText = element.textContent?.trim().toLowerCase();
                for (const text of texts) {
                    if (elementText?.includes(text.toLowerCase())) {
                        console.log(`🎯 Extension: Found intro skip with text: ${elementText}`);
                        element.click();
                        return true;
                    }
                }
            }
        }
        return false;
    }

    clickByAriaLabel(labels) {
        for (const label of labels) {
            const elements = document.querySelectorAll(`[aria-label*="${label}"]`);
            for (const element of elements) {
                if (this.isVisibleAndClickable(element)) {
                    console.log(`🎯 Extension: Found intro skip with aria-label: ${element.getAttribute('aria-label')}`);
                    element.click();
                    return true;
                }
            }
        }
        return false;
    }

    findAndClickSkipButton() {
        const potentialButtons = document.querySelectorAll('button, [role="button"], [class*="button"]');
        for (const button of potentialButtons) {
            if (this.isVisibleAndClickable(button)) {
                const text = button.textContent?.toLowerCase() || '';
                const ariaLabel = button.getAttribute('aria-label')?.toLowerCase() || '';
                
                if ((text.includes('skip') || ariaLabel.includes('skip')) && 
                    (text.includes('intro') || text.includes('credit') || ariaLabel.includes('intro') || ariaLabel.includes('credit'))) {
                    console.log('🎯 Extension: Found intro skip via text analysis');
                    button.click();
                    return true;
                }
            }
        }
        return false;
    }

    isVisibleAndClickable(element) {
        if (!element) return false;
        
        const style = window.getComputedStyle(element);
        const isVisible = style.display !== 'none' && 
                         style.visibility !== 'hidden' && 
                         style.opacity !== '0' &&
                         element.offsetWidth > 0 &&
                         element.offsetHeight > 0;
        
        const isEnabled = !element.disabled && 
                         element.getAttribute('aria-disabled') !== 'true';
        
        return isVisible && isEnabled;
    }

    stop() {
        if (this.observer) this.observer.disconnect();
        if (this.skipInterval) clearInterval(this.skipInterval);
        this.isMonitoring = false;
        console.log('🛑 Extension: Netflix Intro Skipper stopped');
    }

    getStatus() {
        return {
            isMonitoring: this.isMonitoring,
            skipButtonsFound: document.querySelectorAll('[data-uia*="skip"], [class*="skip"]').length,
            videoPresent: !!document.querySelector('video')
        };
    }
}

// Initialize when on Netflix watch page
function initializeSkipper() {
    if (window.location.href.includes('/watch/')) {
        // Clean up existing instance
        if (window.netflixIntroSkipper) {
            window.netflixIntroSkipper.stop();
        }
        
        // Wait for Netflix to load
        setTimeout(() => {
            window.netflixIntroSkipper = new NetflixIntroSkipper();
        }, 3000);
    }
}

// Message listener for background script communication
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    switch (request.action) {
        case 'getStatus':
            const status = window.netflixIntroSkipper ? 
                window.netflixIntroSkipper.getStatus() : 
                { isMonitoring: false, skipButtonsFound: 0, videoPresent: false };
            sendResponse(status);
            break;
        case 'stop':
            if (window.netflixIntroSkipper) {
                window.netflixIntroSkipper.stop();
                sendResponse({ success: true });
            }
            break;
        case 'start':
            initializeSkipper();
            sendResponse({ success: true });
            break;
    }
});

// Initialization
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeSkipper);
} else {
    initializeSkipper();
}

// SPA navigation support
let lastUrl = location.href;
new MutationObserver(() => {
    const url = location.href;
    if (url !== lastUrl) {
        lastUrl = url;
        setTimeout(initializeSkipper, 2000);
    }
}).observe(document, { subtree: true, childList: true });