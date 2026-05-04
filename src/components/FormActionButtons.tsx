// src/components/FormActionButtons.tsx
import { Button } from "@/components/ui/button"

interface FormActionButtonsProps {
  onCancel?: () => void;
  onSave?: () => void;
  saveText: string;
}

export default function FormActionButtons({ onCancel, onSave, saveText }: FormActionButtonsProps) {
  return (
    <div className="flex justify-end gap-2 pt-4 border-t border-slate-100 mt-6">
      <Button variant="outline" onClick={onCancel} type="button">取消變更</Button>
      <Button className="bg-slate-900 hover:bg-slate-800 text-white" onClick={onSave} type="button">
        {saveText}
      </Button>
    </div>
  )
}