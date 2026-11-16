export {};
declare global {
 type AuroraTheme='obsidian'|'porcelain'|'glacier'|'volt';
 type AuroraAppearancePreference=AuroraTheme|'system';
 interface AuroraAppearanceState {readonly preference:AuroraAppearancePreference;readonly theme:AuroraTheme;readonly persisted:boolean;readonly source:string;}
 interface AuroraAppearanceResult extends AuroraAppearanceState {readonly ok:boolean;readonly reason?:'invalid_preference'|'storage_unavailable';}
 interface Window {TerminalAppearance:{readonly storageKey:string;readonly legacyKey:string;readonly themes:readonly AuroraTheme[];readonly preferences:readonly AuroraAppearancePreference[];readonly labels:Readonly<Record<AuroraAppearancePreference,string>>;getPreference():AuroraAppearancePreference;getEffectiveTheme():AuroraTheme;getSnapshot():AuroraAppearanceState;setPreference(value:AuroraAppearancePreference):AuroraAppearanceResult;subscribe(listener:(state:AuroraAppearanceState)=>void):()=>void;};}
}
