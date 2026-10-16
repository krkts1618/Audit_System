import { forwardRef } from "react";

const GlassInput = forwardRef(({ label, id, error, ...rest }, ref) => {
  return (
    <div className="flex flex-col mb-4">
      {label && (
        <label htmlFor={id} className="mb-1 text-sm font-medium text-slate-300">
          {label}
        </label>
      )}
      <input
        id={id}
        ref={ref}
        className={`glass-input ${error ? 'border-crimson-500 focus:ring-crimson-500' : ''}`}
        {...rest}
      />
      {error && <span className="text-xs text-crimson-500 mt-1">{error.message}</span>}
    </div>
  );
});

GlassInput.displayName = "GlassInput";

export default GlassInput;