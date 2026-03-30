const STORAGE_PREFIX = 'vetflow_db_v3_';

const initialData = {
    tenants: [],
    products: [],
    appointments: [],
    sales: [],
    suppliers: [],
    costs: []
};

// Initialize localStorage if empty
Object.keys(initialData).forEach(key => {
    if (!localStorage.getItem(STORAGE_PREFIX + key)) {
        localStorage.setItem(STORAGE_PREFIX + key, JSON.stringify(initialData[key]));
    }
});

class MockDB {
    from(table) {
        this.table = table;
        return this;
    }

    select(columns = '*') {
        const data = JSON.parse(localStorage.getItem(STORAGE_PREFIX + this.table) || '[]');

        const builder = {
            data: [...data],
            error: null,
            // Permite que el builder sea "awaitable"
            then: (resolve) => {
                resolve({ data: builder.data, error: builder.error });
            },
            order: (col, { ascending }) => {
                builder.data.sort((a, b) => {
                    if (a[col] < b[col]) return ascending ? -1 : 1;
                    if (a[col] > b[col]) return ascending ? 1 : -1;
                    return 0;
                });
                return builder;
            },
            eq: (col, val) => {
                builder.data = builder.data.filter(item => item[col] == val);
                return builder;
            },
            gte: (col, val) => {
                builder.data = builder.data.filter(item => item[col] >= val);
                return builder;
            },
            lte: (col, val) => {
                builder.data = builder.data.filter(item => item[col] <= val);
                return builder;
            },
            limit: (n) => {
                builder.data = builder.data.slice(0, n);
                return builder;
            },
            single: () => {
                return Promise.resolve({
                    data: builder.data[0] || null,
                    error: builder.data[0] ? null : { message: 'Not found' }
                });
            }
        };

        return builder;
    }

    insert(records) {
        const tableData = JSON.parse(localStorage.getItem(STORAGE_PREFIX + this.table) || '[]');
        const newRecords = records.map((r, index) => ({
            id: Date.now() + index,
            ...r
        }));
        const updatedData = [...tableData, ...newRecords];
        localStorage.setItem(STORAGE_PREFIX + this.table, JSON.stringify(updatedData));
        return Promise.resolve({ data: newRecords, error: null });
    }

    update(values) {
        return {
            eq: (col, val) => {
                const tableData = JSON.parse(localStorage.getItem(STORAGE_PREFIX + this.table) || '[]');
                const updatedData = tableData.map(item => {
                    if (item[col] == val) return { ...item, ...values };
                    return item;
                });
                localStorage.setItem(STORAGE_PREFIX + this.table, JSON.stringify(updatedData));
                return Promise.resolve({ data: values, error: null });
            }
        };
    }

    delete() {
        return {
            eq: (col, val) => {
                const tableData = JSON.parse(localStorage.getItem(STORAGE_PREFIX + this.table) || '[]');
                const updatedData = tableData.filter(item => item[col] != val);
                localStorage.setItem(STORAGE_PREFIX + this.table, JSON.stringify(updatedData));
                return Promise.resolve({ error: null });
            }
        };
    }
}

export const db = new MockDB();
