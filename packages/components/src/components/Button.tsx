// packages/components/src/components/Button.tsx
import React from 'react';

export interface ButtonProps {
    children: React.ReactNode;
    onClick?: () => void;
    disabled?: boolean;
    variant?: 'primary' | 'secondary';
}

export const Button: React.FC<ButtonProps> = ({
                                                  children,
                                                  onClick,
                                                  disabled = false,
                                                  variant = 'primary'
                                              }) => {
    return (
        <button
            onClick={onClick}
            disabled={disabled}
            className={`btn btn-${variant}`}
        >
            {children}11
        </button>
    );
};

export default Button;
