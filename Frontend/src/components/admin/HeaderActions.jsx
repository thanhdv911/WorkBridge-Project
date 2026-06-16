import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';

export default function HeaderActions({ children }) {
    const [target, setTarget] = useState(null);
    
    useEffect(() => {
        setTarget(document.getElementById('admin-header-actions'));
    }, []);

    if (!target) return null;
    return createPortal(children, target);
}
