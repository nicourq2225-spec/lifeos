"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";

type Category = { id: number; name: string; type: string; parentName: string | null };

export default function TransactionForm({ 
  onSuccess, 
  initialDate,
  transactionToEdit
}: { 
  onSuccess: () => void, 
  initialDate?: string,
  transactionToEdit?: any
}) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [amount, setAmount] = useState(transactionToEdit?.amount?.toString() || "");
  const [date, setDate] = useState(
    transactionToEdit?.date?.split("T")[0] ||
      initialDate ||
      new Date().toLocaleDateString("en-CA", {
        timeZone: "America/Argentina/Buenos_Aires",
      })
  );
  const [type, setType] = useState(transactionToEdit?.type || "GASTO_NECESARIO");
  const [categoryId, setCategoryId] = useState(transactionToEdit?.categoryId?.toString() || "");
  const [description, setDescription] = useState(transactionToEdit?.description || "");
  const [banco, setBanco] = useState(transactionToEdit?.banco || "Efectivo");
  const [cuotas, setCuotas] = useState(transactionToEdit?.cuotas?.toString() || "1");
  const [cuotasError, setCuotasError] = useState("");

  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetch("/api/finanzas")
      .then(res => res.json())
      .then(data => {
        setCategories(data.categories || []);
        if (!transactionToEdit && data.categories?.length > 0) {
          const firstMatch = data.categories.find((c: Category) => c.type === type);
          if (firstMatch) setCategoryId(firstMatch.id.toString());
        }
      });
  }, []);

  // Update categoryId when type changes if current category is invalid
  useEffect(() => {
    if (categories.length > 0 && !transactionToEdit) {
      const currentCat = categories.find(c => c.id.toString() === categoryId);
      if (!currentCat || currentCat.type !== type) {
        const firstMatch = categories.find(c => c.type === type);
        if (firstMatch) setCategoryId(firstMatch.id.toString());
      }
    }
  }, [type, categories]);

  const parsedCuotas = Math.max(1, parseInt(cuotas || "1", 10) || 1);
  const parsedAmount = parseFloat(amount || "0") || 0;
  const installmentPreview =
    parsedCuotas > 1 && parsedAmount > 0
      ? Math.round(parsedAmount / parsedCuotas)
      : 0;

  const handleCuotasBlur = () => {
    const val = parseInt(cuotas, 10);
    if (isNaN(val) || val < 1) {
      setCuotas("1");
      setCuotasError("La cantidad de cuotas no puede ser menor a 1.");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || !categoryId) {
      toast.error("Por favor completa monto y categoría.");
      return;
    }

    const validCuotas = parseInt(cuotas, 10);
    if (isNaN(validCuotas) || validCuotas < 1) {
      setCuotasError("La cantidad de cuotas debe ser 1 o mayor.");
      toast.error("Las cuotas no pueden ser menores a 1.");
      return;
    }

    setIsSubmitting(true);
    try {
      const [y, m, d] = date.split('-');
      const safeDate = new Date(Date.UTC(parseInt(y), parseInt(m) - 1, parseInt(d), 15, 0, 0)).toISOString();

      const payload = {
        id: transactionToEdit?.id,
        amount: Math.round(parseFloat(amount)),
        date: safeDate,
        dateStr: date,
        type,
        categoryId,
        description,
        banco,
        cuotas: validCuotas
      };

      const res = await fetch("/api/finanzas", {
        method: transactionToEdit ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        throw new Error("Error en el servidor");
      }
      
      toast.success(
        transactionToEdit
          ? "Transacción actualizada"
          : validCuotas > 1
            ? `Se registraron ${validCuotas} cuotas de $${Math.round(parseFloat(amount) / validCuotas).toLocaleString("es-AR")}`
            : "Transacción creada"
      );
      onSuccess();
    } catch (error) {
      toast.error("Hubo un error al guardar la transacción.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredCategories = categories.filter(c => c.type === type);

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label htmlFor="tx-type" className="text-xs text-gray-400 block">Tipo</label>
          <select 
            id="tx-type"
            name="type"
            value={type} 
            onChange={(e) => {
              setType(e.target.value);
              const firstMatch = categories.find(c => c.type === e.target.value);
              if (firstMatch) setCategoryId(firstMatch.id.toString());
            }}
            className="w-full bg-black border border-white/20 rounded-lg p-2 mt-1 text-base"
          >
            <option value="GASTO_NECESARIO">Gasto Necesario</option>
            <option value="GASTO_INNECESARIO">Gasto Innecesario</option>
            <option value="INGRESO">Ingreso</option>
          </select>
        </div>
        <div>
          <label htmlFor="tx-date" className="text-xs text-gray-400 block">Fecha</label>
          <input 
            id="tx-date"
            name="date"
            type="date" 
            value={date}
            onChange={(e) => setDate(e.target.value)}
            required
            className="w-full bg-black border border-white/20 rounded-lg p-2 mt-1 text-base"
          />
        </div>
      </div>
      
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label htmlFor="tx-category" className="text-xs text-gray-400 block">Categoría</label>
          <select 
            id="tx-category"
            name="categoryId"
            value={categoryId} 
            onChange={(e) => setCategoryId(e.target.value)}
            className="w-full bg-black border border-white/20 rounded-lg p-2 mt-1 text-base"
          >
            {filteredCategories.map(c => (
              <option key={c.id} value={c.id}>{c.parentName ? `${c.parentName} - ` : ''}{c.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="tx-amount" className="text-xs text-gray-400 block">
            {!transactionToEdit && parsedCuotas > 1 ? "Monto Total ($)" : "Monto ($)"}
          </label>
          <input 
            id="tx-amount"
            name="amount"
            type="number"
            step="1"
            min="1"
            inputMode="numeric"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0"
            required
            className="w-full bg-black border border-white/20 rounded-lg p-2 mt-1 text-base"
          />
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div>
          <label htmlFor="tx-banco" className="text-xs text-gray-400 block">Banco / Cuenta</label>
          <select 
            id="tx-banco"
            name="banco"
            value={banco}
            onChange={(e) => setBanco(e.target.value)}
            className="w-full bg-black border border-white/20 rounded-lg p-2 mt-1 text-base"
          >
            <option value="Efectivo">Efectivo</option>
            <option value="MercadoPago">MercadoPago</option>
            <option value="BBVA">BBVA</option>
            <option value="Bancor">Bancor</option>
            <option value="Naranja X">Naranja X</option>
          </select>
        </div>
        <div>
          <label htmlFor="tx-cuotas" className="text-xs text-gray-400 block">Cuotas</label>
          <input
            id="tx-cuotas"
            name="cuotas"
            type="number"
            min="1"
            step="1"
            inputMode="numeric"
            aria-describedby="tx-cuotas-help"
            value={cuotas}
            onChange={(e) => {
              setCuotas(e.target.value);
              if (cuotasError) setCuotasError("");
            }}
            onBlur={handleCuotasBlur}
            required
            className="w-full bg-black border border-white/20 rounded-lg p-2 mt-1 text-base font-bold"
          />
        </div>
        <div>
          <label htmlFor="tx-description" className="text-xs text-gray-400 block">Descripción</label>
          <input 
            id="tx-description"
            name="description"
            type="text" 
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Detalles..."
            className="w-full bg-black border border-white/20 rounded-lg p-2 mt-1 text-base"
          />
        </div>
      </div>

      {cuotasError && (
        <p id="tx-cuotas-help" role="alert" aria-live="polite" className="text-xs text-negative font-semibold">
          ⚠️ {cuotasError}
        </p>
      )}

      {!transactionToEdit && parsedCuotas > 1 && installmentPreview > 0 && !cuotasError && (
        <div
          id="tx-cuotas-help"
          aria-live="polite"
          className="bg-cyan-950/30 border border-cyan-500/30 rounded-xl p-3 text-xs text-cyan-200"
        >
          💳 Se crearán <strong>{parsedCuotas} cuotas de ${installmentPreview.toLocaleString("es-AR")}</strong> cada una: la 1ra el <strong>{date}</strong> y las restantes el <strong>día 1</strong> de los meses sucesivos en la misma categoría.
        </div>
      )}

      <button type="submit" disabled={isSubmitting} className="w-full bg-white text-black font-bold rounded-lg p-3 disabled:opacity-50">
        {isSubmitting ? "Guardando..." : transactionToEdit ? "Actualizar" : "Guardar Registro"}
      </button>
    </form>
  );
}
