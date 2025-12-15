// sync.js - Скрипт для синхронизации данных
const SyncManager = {
    // Настройки синхронизации
    config: {
        autoSync: true,
        syncInterval: 5 * 60 * 1000, // 5 минут
        notifyChanges: true,
        lastSync: null
    },

    // Инициализация
    init() {
        this.loadConfig();
        
        if (this.config.autoSync) {
            this.startAutoSync();
        }
        
        // Прослушиваем изменения в localStorage
        window.addEventListener('storage', (e) => {
            if (e.key === 'products' || e.key === 'categoriesData') {
                this.onStorageChange(e);
            }
        });
    },

    // Загрузка конфигурации
    loadConfig() {
        const savedConfig = localStorage.getItem('syncConfig');
        if (savedConfig) {
            this.config = { ...this.config, ...JSON.parse(savedConfig) };
        }
        
        this.config.lastSync = localStorage.getItem('lastSync');
    },

    // Сохранение конфигурации
    saveConfig() {
        localStorage.setItem('syncConfig', JSON.stringify(this.config));
    },

    // Автоматическая синхронизация
    startAutoSync() {
        setInterval(() => {
            this.sync();
        }, this.config.syncInterval);
    },

    // Синхронизация данных
    async sync() {
        try {
            console.log('🔄 Начало синхронизации...');
            
            const currentProducts = JSON.parse(localStorage.getItem('products') || '[]');
            const currentCategories = JSON.parse(localStorage.getItem('categoriesData') || '[]');
            
            // Здесь можно добавить синхронизацию с сервером
            // const serverData = await this.fetchFromServer();
            
            // Для демо - просто сохраняем время последней синхронизации
            this.config.lastSync = new Date().toISOString();
            localStorage.setItem('lastSync', this.config.lastSync);
            this.saveConfig();
            
            console.log('✅ Синхронизация завершена');
            
            if (this.config.notifyChanges) {
                this.showNotification('Данные синхронизированы', 'success');
            }
            
        } catch (error) {
            console.error('❌ Ошибка синхронизации:', error);
            this.showNotification('Ошибка синхронизации', 'error');
        }
    },

    // Обработчик изменения в localStorage
    onStorageChange(event) {
        if (this.config.notifyChanges && event.newValue) {
            const message = event.key === 'products' 
                ? 'Товары обновлены' 
                : 'Категории обновлены';
            
            this.showNotification(message, 'info');
            
            // Перезагружаем данные на странице
            if (typeof window.loadFromAdmin === 'function') {
                setTimeout(() => window.loadFromAdmin(), 1000);
            }
        }
    },

    // Показать уведомление
    showNotification(message, type = 'info') {
        if (typeof window.showNotification === 'function') {
            window.showNotification(message, type);
        } else {
            // Фолбэк уведомление
            const notification = document.createElement('div');
            notification.style.cssText = `
                position: fixed;
                top: 20px;
                right: 20px;
                padding: 12px 20px;
                background: ${this.getColorByType(type)};
                color: white;
                border-radius: 8px;
                box-shadow: 0 5px 15px rgba(0,0,0,0.2);
                z-index: 10000;
                animation: slideIn 0.3s ease;
            `;
            notification.innerHTML = `
                <div style="display: flex; align-items: center; gap: 10px;">
                    <i class="fas fa-${this.getIconByType(type)}"></i>
                    <span>${message}</span>
                </div>
            `;
            
            document.body.appendChild(notification);
            
            setTimeout(() => {
                notification.style.animation = 'slideOut 0.3s ease';
                setTimeout(() => notification.remove(), 300);
            }, 3000);
        }
    },

    // Получить цвет по типу уведомления
    getColorByType(type) {
        const colors = {
            success: '#27ae60',
            error: '#e74c3c',
            warning: '#f39c12',
            info: '#3498db'
        };
        return colors[type] || colors.info;
    },

    // Получить иконку по типу уведомления
    getIconByType(type) {
        const icons = {
            success: 'check-circle',
            error: 'exclamation-circle',
            warning: 'exclamation-triangle',
            info: 'info-circle'
        };
        return icons[type] || icons.info;
    },

    // Сравнить данные
    compareData(oldData, newData) {
        const differences = {
            added: [],
            updated: [],
            removed: []
        };

        const oldMap = new Map(oldData.map(item => [item.id, item]));
        const newMap = new Map(newData.map(item => [item.id, item]));

        // Найти новые и обновленные
        newData.forEach(newItem => {
            const oldItem = oldMap.get(newItem.id);
            if (!oldItem) {
                differences.added.push(newItem);
            } else if (JSON.stringify(oldItem) !== JSON.stringify(newItem)) {
                differences.updated.push(newItem);
            }
        });

        // Найти удаленные
        oldData.forEach(oldItem => {
            if (!newMap.has(oldItem.id)) {
                differences.removed.push(oldItem);
            }
        });

        return differences;
    },

    // Экспорт данных
    exportData(format = 'json') {
        const data = {
            products: JSON.parse(localStorage.getItem('products') || '[]'),
            categories: JSON.parse(localStorage.getItem('categoriesData') || '[]'),
            siteSettings: JSON.parse(localStorage.getItem('siteSettings') || '{}'),
            exportDate: new Date().toISOString(),
            version: '1.0'
        };

        if (format === 'json') {
            return JSON.stringify(data, null, 2);
        } else if (format === 'csv') {
            return this.convertToCSV(data.products);
        }

        return data;
    },

    // Конвертация в CSV
    convertToCSV(products) {
        if (products.length === 0) return '';
        
        const headers = ['Название товара', 'Категория', 'Цена продажи', 'Количество', 'Статус', 'Описание'];
        const rows = products.map(product => [
            `"${product.name}"`,
            `"${product.category}"`,
            product.price,
            product.quantity,
            product.status === 'in_stock' ? 'В наличии' : 
            product.status === 'out_of_stock' ? 'Нет в наличии' : 'Под заказ',
            `"${product.description}"`
        ]);
        
        return [headers.join(';'), ...rows.map(row => row.join(';'))].join('\n');
    },

    // Проверка совместимости
    checkCompatibility() {
        const requiredFields = ['products', 'categoriesData'];
        const missingFields = requiredFields.filter(field => !localStorage.getItem(field));
        
        if (missingFields.length > 0) {
            console.warn('⚠️ Отсутствуют поля:', missingFields);
            return false;
        }
        
        return true;
    },

    // Восстановление из бэкапа
    restoreFromBackup(backupData) {
        try {
            const data = typeof backupData === 'string' ? JSON.parse(backupData) : backupData;
            
            if (data.products) {
                localStorage.setItem('products', JSON.stringify(data.products));
            }
            
            if (data.categories) {
                localStorage.setItem('categoriesData', JSON.stringify(data.categories));
            }
            
            if (data.siteSettings) {
                localStorage.setItem('siteSettings', JSON.stringify(data.siteSettings));
            }
            
            this.showNotification('✅ Данные восстановлены из бэкапа', 'success');
            return true;
            
        } catch (error) {
            console.error('❌ Ошибка восстановления:', error);
            this.showNotification('Ошибка восстановления данных', 'error');
            return false;
        }
    }
};

// Экспорт для использования в других файлах
if (typeof module !== 'undefined' && module.exports) {
    module.exports = SyncManager;
} else {
    window.SyncManager = SyncManager;
}

// Добавляем стили для анимаций
const syncStyles = document.createElement('style');
syncStyles.textContent = `
    @keyframes slideIn {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
    }
    @keyframes slideOut {
        from { transform: translateX(0); opacity: 1; }
        to { transform: translateX(100%); opacity: 0; }
    }
`;
document.head.appendChild(syncStyles);

// Автоматическая инициализация при загрузке
document.addEventListener('DOMContentLoaded', () => {
    SyncManager.init();
});

