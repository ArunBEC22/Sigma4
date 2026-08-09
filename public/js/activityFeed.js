/**
 * Activity Feed Widget
 * Shows real-time booking and review activities
 */

class ActivityFeed {
    constructor() {
        this.activities = [];
        this.lastSeenActivityId = null; // Track last seen activity
        this.isVisible = false;
        this.updateInterval = 30000; // 30 seconds
        this.displayDuration = 5000; // 5 seconds per notification
        this.init();
    }

    init() {
        // Load last seen activity from localStorage
        this.lastSeenActivityId = localStorage.getItem('lastSeenActivityId');
        
        this.createWidget();
        this.fetchActivities();
        this.startAutoUpdate();
    }

    createWidget() {
        // Create floating button
        const button = document.createElement('div');
        button.id = 'activity-feed-button';
        button.innerHTML = `
            <div class="activity-button-icon">🔥</div>
            <div class="activity-button-badge hidden" id="activity-count-badge">0</div>
            <div class="activity-button-tooltip">View Recent Activity</div>
        `;
        button.onclick = () => this.toggle();
        document.body.appendChild(button);

        // Create widget container (hidden by default)
        const widget = document.createElement('div');
        widget.id = 'activity-feed-widget';
        widget.style.display = 'none';
        widget.innerHTML = `
            <div class="activity-feed-container">
                <div class="activity-feed-header">
                    <span class="activity-icon">🔥</span>
                    <span class="activity-title">Recent Activity</span>
                    <button class="activity-close" onclick="activityFeed.hide()">&times;</button>
                </div>
                <div class="activity-feed-body" id="activity-feed-body">
                    <div class="activity-loading">Loading activities...</div>
                </div>
            </div>
        `;
        document.body.appendChild(widget);

        // Add styles
        this.addStyles();
    }

    addStyles() {
        const style = document.createElement('style');
        style.textContent = `
            /* Floating Button */
            #activity-feed-button {
                position: fixed;
                bottom: 20px;
                left: 20px;
                z-index: 9999;
                cursor: pointer;
                font-family: "Plus Jakarta Sans", sans-serif;
            }

            .activity-button-icon {
                width: 56px;
                height: 56px;
                background: linear-gradient(135deg, #52b788 0%, #40916c 100%);
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 28px;
                box-shadow: 0 4px 20px rgba(82, 183, 136, 0.4);
                transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                animation: pulse 2s ease-in-out infinite;
            }

            #activity-feed-button:hover .activity-button-icon {
                transform: scale(1.1);
                box-shadow: 0 6px 28px rgba(82, 183, 136, 0.6);
                animation: none;
            }

            .activity-button-badge {
                position: absolute;
                top: -5px;
                right: -5px;
                background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
                color: white;
                border-radius: 50%;
                min-width: 24px;
                height: 24px;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 12px;
                font-weight: 700;
                padding: 0 6px;
                box-shadow: 0 2px 8px rgba(239, 68, 68, 0.4);
                border: 2px solid white;
                animation: badgePop 0.3s cubic-bezier(0.4, 0, 0.2, 1);
            }

            .activity-button-badge.hidden {
                display: none;
            }

            @keyframes badgePop {
                0% {
                    transform: scale(0);
                }
                50% {
                    transform: scale(1.2);
                }
                100% {
                    transform: scale(1);
                }
            }

            .activity-button-tooltip {
                position: absolute;
                left: 70px;
                top: 50%;
                transform: translateY(-50%);
                background: linear-gradient(135deg, #4b5043 0%, #2d5016 100%);
                color: white;
                padding: 10px 16px;
                border-radius: 8px;
                font-size: 14px;
                font-weight: 600;
                white-space: nowrap;
                opacity: 0;
                pointer-events: none;
                transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                box-shadow: 0 4px 12px rgba(75, 80, 67, 0.3);
            }

            .activity-button-tooltip::before {
                content: '';
                position: absolute;
                left: -6px;
                top: 50%;
                transform: translateY(-50%);
                width: 0;
                height: 0;
                border-top: 6px solid transparent;
                border-bottom: 6px solid transparent;
                border-right: 6px solid #4b5043;
            }

            #activity-feed-button:hover .activity-button-tooltip {
                opacity: 1;
                left: 75px;
            }

            /* Widget Panel */
            #activity-feed-widget {
                position: fixed;
                bottom: 90px;
                left: 20px;
                z-index: 9998;
                font-family: "Plus Jakarta Sans", sans-serif;
            }

            .activity-feed-container {
                background: white;
                border-radius: 16px;
                box-shadow: 0 8px 32px rgba(75, 80, 67, 0.15);
                width: 340px;
                max-height: 450px;
                overflow: hidden;
                animation: slideIn 0.4s cubic-bezier(0.4, 0, 0.2, 1);
                border: 2px solid rgba(75, 80, 67, 0.1);
            }

            @keyframes slideIn {
                from {
                    transform: translateY(20px) scale(0.95);
                    opacity: 0;
                }
                to {
                    transform: translateY(0) scale(1);
                    opacity: 1;
                }
            }

            @keyframes pulse {
                0%, 100% {
                    transform: scale(1);
                }
                50% {
                    transform: scale(1.05);
                }
            }

            .activity-feed-header {
                background: linear-gradient(135deg, #4b5043 0%, #2d5016 100%);
                color: white;
                padding: 16px;
                display: flex;
                align-items: center;
                gap: 12px;
            }

            .activity-icon {
                font-size: 22px;
                animation: pulse 2s ease-in-out infinite;
            }

            @keyframes pulse {
                0%, 100% {
                    transform: scale(1);
                }
                50% {
                    transform: scale(1.1);
                }
            }

            .activity-title {
                flex: 1;
                font-weight: 600;
                font-size: 16px;
            }

            .activity-close {
                background: rgba(255, 255, 255, 0.2);
                border: none;
                color: white;
                font-size: 20px;
                cursor: pointer;
                padding: 0;
                width: 28px;
                height: 28px;
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                transition: all 0.2s;
            }

            .activity-close:hover {
                background: rgba(255, 255, 255, 0.3);
                transform: rotate(90deg);
            }

            .activity-feed-body {
                max-height: 380px;
                overflow-y: auto;
                padding: 12px;
                background: #f8faf9;
            }

            .activity-feed-body::-webkit-scrollbar {
                width: 6px;
            }

            .activity-feed-body::-webkit-scrollbar-track {
                background: #f1f1f1;
                border-radius: 10px;
            }

            .activity-feed-body::-webkit-scrollbar-thumb {
                background: #4b5043;
                border-radius: 10px;
            }

            .activity-feed-body::-webkit-scrollbar-thumb:hover {
                background: #2d5016;
            }

            .activity-item {
                padding: 14px;
                border-radius: 12px;
                margin-bottom: 10px;
                background: white;
                border-left: 4px solid #52b788;
                cursor: pointer;
                transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                animation: fadeIn 0.4s ease-out;
                box-shadow: 0 2px 8px rgba(75, 80, 67, 0.08);
            }

            @keyframes fadeIn {
                from {
                    opacity: 0;
                    transform: translateX(20px);
                }
                to {
                    opacity: 1;
                    transform: translateX(0);
                }
            }

            .activity-item:hover {
                background: #f1faee;
                transform: translateX(-4px);
                box-shadow: 0 4px 16px rgba(75, 80, 67, 0.15);
                border-left-color: #2d5016;
            }

            .activity-item.booking {
                border-left-color: #52b788;
            }

            .activity-item.review {
                border-left-color: #40916c;
            }

            .activity-item.view {
                border-left-color: #95d5b2;
            }

            .activity-item-icon {
                font-size: 20px;
                margin-right: 10px;
                display: inline-block;
                vertical-align: middle;
            }

            .activity-item-message {
                font-size: 14px;
                color: #2d5016;
                margin-bottom: 6px;
                font-weight: 500;
                line-height: 1.4;
            }

            .activity-item-time {
                font-size: 11px;
                color: #52b788;
                font-weight: 500;
            }

            .activity-loading {
                text-align: center;
                padding: 30px 20px;
                color: #4b5043;
            }

            .activity-loading::after {
                content: '...';
                animation: dots 1.5s steps(4, end) infinite;
            }

            @keyframes dots {
                0%, 20% { content: '.'; }
                40% { content: '..'; }
                60%, 100% { content: '...'; }
            }

            .activity-empty {
                text-align: center;
                padding: 40px 20px;
                color: #4b5043;
            }

            .activity-empty-icon {
                font-size: 56px;
                margin-bottom: 12px;
                opacity: 0.6;
            }

            .activity-empty p {
                margin: 8px 0 0 0;
                font-size: 14px;
                color: #6c757d;
            }

            /* Notification popup */
            .activity-notification {
                position: fixed;
                bottom: 20px;
                right: 20px;
                background: linear-gradient(135deg, #f1faee 0%, white 100%);
                border-radius: 14px;
                box-shadow: 0 8px 32px rgba(75, 80, 67, 0.2);
                padding: 16px;
                max-width: 340px;
                z-index: 10000;
                animation: slideIn 0.4s cubic-bezier(0.4, 0, 0.2, 1);
                cursor: pointer;
                border: 2px solid #52b788;
            }

            .activity-notification:hover {
                transform: translateY(-4px);
                box-shadow: 0 12px 40px rgba(75, 80, 67, 0.25);
            }

            @media (max-width: 768px) {
                #activity-feed-button {
                    bottom: 10px;
                    left: 10px;
                }

                .activity-button-icon {
                    width: 50px;
                    height: 50px;
                    font-size: 24px;
                }

                .activity-button-tooltip {
                    display: none;
                }

                #activity-feed-widget {
                    bottom: 70px;
                    left: 10px;
                    right: 10px;
                }

                .activity-feed-container {
                    width: calc(100vw - 20px);
                    max-width: 100%;
                }
            }
        `;
        document.head.appendChild(style);
    }

    async fetchActivities() {
        try {
            const response = await fetch('/api/activity/recent?limit=10');
            const data = await response.json();

            if (data.success) {
                const newActivities = data.activities.filter(
                    activity => !this.activities.find(a => a.id === activity.id)
                );

                // Show notification for new activities
                if (this.activities.length > 0 && newActivities.length > 0) {
                    this.showNotification(newActivities[0]);
                }

                this.activities = data.activities;
                this.renderActivities();
                this.updateBadge();
            }
        } catch (error) {
            console.error('Error fetching activities:', error);
        }
    }

    renderActivities() {
        const body = document.getElementById('activity-feed-body');

        if (this.activities.length === 0) {
            body.innerHTML = `
                <div class="activity-empty">
                    <div class="activity-empty-icon">📭</div>
                    <p>No recent activities</p>
                </div>
            `;
            return;
        }

        body.innerHTML = this.activities.map(activity => {
            const listingId = activity.listingId || '';
            return `
                <div class="activity-item" data-listing-id="${listingId}" style="cursor: pointer;">
                    <div class="activity-item-message">
                        <span class="activity-item-icon">${activity.icon}</span>
                        ${activity.message}
                    </div>
                    <div class="activity-item-time">${activity.timeAgo}</div>
                </div>
            `;
        }).join('');

        // Add click event listeners
        const items = body.querySelectorAll('.activity-item');
        items.forEach(item => {
            item.addEventListener('click', () => {
                const listingId = item.getAttribute('data-listing-id');
                this.handleActivityClick(listingId);
            });
        });
    }

    showNotification(activity) {
        // Don't show if widget is already visible
        if (this.isVisible) return;

        const notification = document.createElement('div');
        notification.className = 'activity-notification';
        notification.innerHTML = `
            <div class="activity-item-message">
                <span class="activity-item-icon">${activity.icon}</span>
                ${activity.message}
            </div>
            <div class="activity-item-time">${activity.timeAgo}</div>
        `;

        notification.onclick = () => {
            this.show();
            document.body.removeChild(notification);
        };

        document.body.appendChild(notification);

        // Auto-remove after 5 seconds
        setTimeout(() => {
            if (document.body.contains(notification)) {
                notification.style.animation = 'slideOut 0.3s ease-out';
                setTimeout(() => {
                    if (document.body.contains(notification)) {
                        document.body.removeChild(notification);
                    }
                }, 300);
            }
        }, this.displayDuration);
    }

    handleActivityClick(listingId) {
        console.log('Activity clicked! Listing ID:', listingId);
        console.log('Type of listingId:', typeof listingId);
        console.log('Navigating to:', `/listings/${listingId}`);
        
        if (listingId && listingId !== 'null' && listingId !== 'undefined' && listingId !== '') {
            window.location.href = `/listings/${listingId}`;
        } else {
            console.error('Invalid listing ID:', listingId);
        }
    }

    show() {
        const widget = document.getElementById('activity-feed-widget');
        widget.style.display = 'block';
        this.isVisible = true;
        
        // Mark all current activities as seen
        if (this.activities.length > 0) {
            this.lastSeenActivityId = this.activities[0].id;
            // Store in localStorage to persist across page reloads
            localStorage.setItem('lastSeenActivityId', this.lastSeenActivityId);
        }
        
        // Clear badge when opened
        this.clearBadge();
    }

    hide() {
        const widget = document.getElementById('activity-feed-widget');
        widget.style.display = 'none';
        this.isVisible = false;
    }

    toggle() {
        if (this.isVisible) {
            this.hide();
        } else {
            this.show();
        }
    }

    getUnseenCount() {
        if (!this.lastSeenActivityId || this.activities.length === 0) {
            return this.activities.length;
        }

        // Count activities that are newer than last seen
        let unseenCount = 0;
        for (const activity of this.activities) {
            if (activity.id === this.lastSeenActivityId) {
                break; // Stop when we reach the last seen activity
            }
            unseenCount++;
        }
        
        return unseenCount;
    }

    updateBadge() {
        const badge = document.getElementById('activity-count-badge');
        if (!badge) return;

        const unseenCount = this.getUnseenCount();
        
        if (unseenCount > 0 && !this.isVisible) {
            badge.textContent = unseenCount > 99 ? '99+' : unseenCount;
            badge.classList.remove('hidden');
        } else {
            badge.classList.add('hidden');
        }
    }

    clearBadge() {
        const badge = document.getElementById('activity-count-badge');
        if (badge) {
            badge.classList.add('hidden');
        }
    }

    startAutoUpdate() {
        setInterval(() => {
            this.fetchActivities();
        }, this.updateInterval);
    }
}

// Initialize activity feed when DOM is ready
let activityFeed;
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        activityFeed = new ActivityFeed();
    });
} else {
    activityFeed = new ActivityFeed();
}

// Made with Bob