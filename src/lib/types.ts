export type FloorPlanElementType =
  | "table_round"
  | "table_square"
  | "table_rect"
  | "bar"
  | "stage"
  | "column"
  | "chair";

export type FloorPlanElement = {
  id: string;
  element_type: FloorPlanElementType;
  label: string | null;
  x_m: number;
  y_m: number;
  width_m: number;
  height_m: number;
  rotation_deg: number;
  parent_element_id: string | null;
  chair_index: number | null;
  chair_count: number;
};

export type FloorPlanGuest = {
  id: string;
  name: string;
  email: string | null;
  table_element_id: string | null;
  seat_element_id: string | null;
  notes: string | null;
  position: number;
  checked_in: boolean;
};

export type Venue = {
  id: string;
  name: string;
  room_width_m: number;
  room_height_m: number;
  room_rotation_deg: number;
  room_configured: boolean;
  elements: FloorPlanElement[];
  guests: FloorPlanGuest[];
  updated_at: string;
};
