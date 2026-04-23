module one_capsule::capsule {
    use std::string::String;
    use sui::clock::Clock;
    use sui::event;

    // ─── Structs ───────────────────────────────────────────────────────────────

    /// ONE Championship 観戦の感動を永久保存するカプセル。
    /// raw_memo (step3_memo) は不変の「原液」— ミント後に変更不可。
    public struct Capsule has key, store {
        id: UID,
        /// Walrus に保存した写真の Blob ID
        photo_blob_id: String,
        /// Step 1: 感動カテゴリ (例: "技", "精神力", "逆転")
        step1_category: String,
        /// Step 1: 選んだ具体的な要素 (例: ["肘打ち", "カーフキック"])
        step1_items: vector<String>,
        /// Step 1: 自由記述補足
        step1_free_text: String,
        /// Step 2: 感情の極性 ("positive" / "negative" / "mixed")
        step2_polarity: String,
        /// Step 2: 感情サブカテゴリ (例: "震撼", "歓喜", "涙")
        step2_subcategory: String,
        /// Step 2: 選手との繋がり方 (例: "直接", "間接", "初対面")
        step2_connection: String,
        /// Step 3: 自分の言葉による原液メモ (不変)
        step3_memo: String,
        /// ミント日時 (Unix timestamp ms, Clock から取得)
        minted_at_ms: u64,
        /// 観戦イベント名
        event_name: String,
        /// 応援選手タグ
        fighter_tag: String,
        /// ミントしたアドレス
        creator: address,
    }

    /// ミント時に emit するイベント。
    /// String はコピー可能だが、イベントは最小限の識別情報のみ保持する。
    public struct MintedEvent has copy, drop {
        capsule_id: ID,
        creator: address,
        minted_at_ms: u64,
    }

    // ─── Public functions ───────────────────────────────────────────────────────

    // Clock から minted_at_ms を取得することでクライアント改ざんを防ぐ。
    // self_transfer は PTB composability のため将来的に返り値化する予定。
    #[allow(lint(self_transfer))]
    public fun mint(
        photo_blob_id: String,
        step1_category: String,
        step1_items: vector<String>,
        step1_free_text: String,
        step2_polarity: String,
        step2_subcategory: String,
        step2_connection: String,
        step3_memo: String,
        event_name: String,
        fighter_tag: String,
        clock: &Clock,
        ctx: &mut TxContext,
    ) {
        let minted_at_ms = clock.timestamp_ms();
        let creator = ctx.sender();

        let capsule = Capsule {
            id: object::new(ctx),
            photo_blob_id,
            step1_category,
            step1_items,
            step1_free_text,
            step2_polarity,
            step2_subcategory,
            step2_connection,
            step3_memo,
            minted_at_ms,
            event_name,
            fighter_tag,
            creator,
        };

        event::emit(MintedEvent {
            capsule_id: object::id(&capsule),
            creator,
            minted_at_ms,
        });

        transfer::transfer(capsule, creator);
    }

    // ─── View functions ────────────────────────────────────────────────────────

    public fun photo_blob_id(c: &Capsule): &String { &c.photo_blob_id }
    public fun step3_memo(c: &Capsule): &String    { &c.step3_memo }
    public fun event_name(c: &Capsule): &String    { &c.event_name }
    public fun fighter_tag(c: &Capsule): &String   { &c.fighter_tag }
    public fun minted_at_ms(c: &Capsule): u64      { c.minted_at_ms }
    public fun creator(c: &Capsule): address        { c.creator }

    // ─── Package-internal UID accessors (dynamic field 用) ───────────────────
    // translation / feedback モジュールが df を付与するために使う。
    // public(package) により外部パッケージからは不可視。

    public(package) fun uid_ref(c: &Capsule): &UID         { &c.id }
    public(package) fun uid_mut(c: &mut Capsule): &mut UID { &mut c.id }
}
