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
  const [date, setDate] = useState(transactionToEdit?.date?.split('T')[0] || initialDate || new Date().toISOString().split('T')[0]);
  const [type, setType] = useState(transactionToEdit?.type || "GASTO_NECESARIO");
  const [categoryId, setCategoryId] = useState(transactionToEdit?.categoryId?.toString() || "");
  const [description, setDescription] = useState(transactionToEdit?.description || "");
  const [banco, setBanco] = useState(transactionToEdit?.banco || "Efectivo");

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || !categoryId) {
      toast.error("Por favor completa monto y categoría.");
      return;
    }

    setIsSubmitting(true);
    try {
      const [y, m, d] = date.split('-');
      // Guardamos a las 12 PM (mediodía) local para evitar desfasaje de zona horaria
      const safeDate = new Date(parseInt(y), parseInt(m)-1, parseInt(d), 12, 0, 0).toISOString();

      const payload = {
        id: transactionToEdit?.id,
        amount: Math.round(parseFloat(amount)), // Sin decimales
        date: safeDate,
        type,
        categoryId,
        description,
        banco
      };

      const res = await fetch("/api/finanzas", {
        method: transactionToEdit ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        throw new Error("Error en el servidor");
      }
      
      toast.success(transactionToEdit ? "Transacción actualizada" : "Transacción creada");
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
          <label className="text-xs text-gray-400">Tipo</label>
          <select 
            value={type} 
            onChange={(e) => {
              setType(e.target.value);
              const firstMatch = categories.find(c => c.type === e.target.value);
              if (firstMatch) setCategoryId(firstMatch.id.toString());
            }}
            className="w-full bg-black border border-white/20 rounded-lg p-2 mt-1 text-sm"
          >
            <option value="GASTO_NECESARIO">Gasto Necesario</option>
            <option value="GASTO_INNECESARIO">Gasto Innecesario</option>
            <option value="INGRESO">Ingreso</option>
          </select>
        </div>
        <div>
          <label className="text-xs text-gray-400">Fecha</label>
          <input 
            type="date" 
            value={date} onChange={(e) => setDate(e.target.value)}
            className="w-full bg-black border border-white/20 rounded-lg p-2 mt-1 text-sm"
          />
        </div>
      </div>
      
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="text-xs text-gray-400">Categoría</label>
          <select 
            value={categoryId} 
            onChange={(e) => setCategoryId(e.target.value)}
            className="w-full bg-black border border-white/20 rounded-lg p-2 mt-1 text-sm"
          >
            {filteredCategories.map(c => (
              <option key={c.id} value={c.id}>{c.parentName ? `${c.parentName} - ` : ''}{c.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-xs text-gray-400">Monto ($)</label>
          <input 
            type="number" step="1" 
            value={amount} onChange={(e) => setAmount(e.target.value)}
            placeholder="0" required
            className="w-full bg-black border border-white/20 rounded-lg p-2 mt-1 text-sm"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="text-xs text-gray-400">Banco / Cuenta</label>
          <select 
            value={banco} onChange={(e) => setBanco(e.target.value)}
            className="w-full bg-black border border-white/20 rounded-lg p-2 mt-1 text-sm"
          >
            <option value="Efectivo">Efectivo</option>
            <option value="MercadoPago">MercadoPago</option>
            <option value="BBVA">BBVA</option>
            <option value="Bancor">Bancor</option>
            <option value="Naranja X">Naranja X</option>
          </select>
        </div>
        <div>
          <label className="text-xs text-gray-400">Descripción (Opcional)</label>
          <input 
            type="text" 
            value={description} onChange={(e) => setDescription(e.target.value)}
            placeholder="Detalles..."
            className="w-full bg-black border border-white/20 rounded-lg p-2 mt-1 text-sm"
          />
        </div>
      </div>

      <button type="submit" disabled={isSubmitting} className="w-full bg-white text-black font-bold rounded-lg p-3 disabled:opacity-50">
        {isSubmitting ? "Guardando..." : transactionToEdit ? "Actualizar" : "Guardar Registro"}
      </button>
    </form>
  );
}
