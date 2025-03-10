import { Session } from '@supabase/supabase-js';

export interface FlashMessageType {
    category: string;
    message: string;
}

export interface AppContextInterface {
    session: Session | null;
    flashMessages: FlashMessageType[];
    setFlashMessages: (messages: FlashMessageType[] | ((prev: FlashMessageType[]) => FlashMessageType[])) => void;
} 