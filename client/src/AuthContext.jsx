import React, { createContext, useState, useContext, useEffect } from 'react';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [token, setToken] = useState(localStorage.getItem('token'));
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (token) {
            // Verify token and get user info
            fetch('/api/auth/me', {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            })
                .then(res => res.json())
                .then(data => {
                    if (data.user) {
                        setUser(data.user);
                    } else {
                        // Invalid token
                        localStorage.removeItem('token');
                        setToken(null);
                    }
                })
                .catch(() => {
                    localStorage.removeItem('token');
                    setToken(null);
                })
                .finally(() => setLoading(false));
        } else {
            setLoading(false);
        }
    }, [token]);

    const login = async (username, password) => {
        const res = await fetch('/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });

        const data = await res.json();

        if (res.ok) {
            setToken(data.token);
            setUser(data.user);
            localStorage.setItem('token', data.token);
            return { success: true };
        } else {
            return { success: false, error: data.error };
        }
    };

    const logout = () => {
        setToken(null);
        setUser(null);
        localStorage.removeItem('token');
    };

    return (
        <AuthContext.Provider value={{ user, token, login, logout, loading }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within AuthProvider');
    }
    return context;
};
