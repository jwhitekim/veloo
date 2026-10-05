from fastapi import APIRouter, Depends, HTTPException
from supabase import Client
from server.app.database import get_supabase
import schemas

router = APIRouter(prefix="/api/steps", tags=["steps"])


@router.patch("/{step_id}", response_model=schemas.StepOut)
def update_step(step_id: int, step_in: schemas.StepUpdate, sb: Client = Depends(get_supabase)):
    data = step_in.model_dump(exclude_none=True)
    res = sb.table("steps").update(data).eq("id", step_id).execute()
    if not res.data:
        raise HTTPException(status_code=404, detail="Step not found")
    return res.data[0]


@router.patch("/{step_id}/done", response_model=schemas.StepOut)
def toggle_step_done(step_id: int, sb: Client = Depends(get_supabase)):
    current = sb.table("steps").select("done").eq("id", step_id).single().execute()
    if not current.data:
        raise HTTPException(status_code=404, detail="Step not found")
    res = sb.table("steps").update({"done": not current.data["done"]}).eq("id", step_id).execute()
    if not res.data:
        raise HTTPException(status_code=500, detail="Step 업데이트에 실패했습니다.")
    return res.data[0]


@router.delete("/{step_id}")
def delete_step(step_id: int, sb: Client = Depends(get_supabase)):
    sb.table("steps").delete().eq("id", step_id).execute()
    return {"ok": True}
