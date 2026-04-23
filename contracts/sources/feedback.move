/// フィードバック集約モジュール。
///
/// 設計: Capsule は creator の所有物のまま。閲覧者のフィードバックは
/// FeedbackRegistry (shared object) に capsule_id をキーとして蓄積する。
/// これにより Capsule の「所有」セマンティクスを維持しつつ、
/// 誰でも feedback を追加できるオープンな書き込みを実現する。
module one_capsule::feedback {
    use std::string::String;
    use sui::table::{Self, Table};
    use sui::clock::Clock;
    use sui::event;

    // ─── Structs ───────────────────────────────────────────────────────────────

    /// 閲覧者 1 件分のフィードバック参照。
    /// 本文は Walrus に、アクセス制御は Seal ポリシーで保護する。
    public struct FeedbackRef has store, copy, drop {
        /// Walrus に保存したフィードバック本文の Blob ID
        walrus_blob_id: String,
        /// Seal アクセスポリシーオブジェクト ID
        seal_policy_id: String,
        /// 閲覧者ティア: 0=beginner / 1=intermediate / 2=hardcore
        viewer_tier: u8,
        /// 結果評価: 0=communicated / 1=want_more / 2=different_interpretation
        outcome: u8,
        /// 送信時刻 (ms)
        submitted_at_ms: u64,
    }

    /// capsule_id → Vec<FeedbackRef> を保持する shared registry。
    /// 誰でも attach_feedback を呼べるが、書き込みは append-only。
    public struct FeedbackRegistry has key {
        id: UID,
        entries: Table<ID, vector<FeedbackRef>>,
    }

    public struct FeedbackSubmittedEvent has copy, drop {
        registry_id: ID,
        capsule_id: ID,
        viewer_tier: u8,
        outcome: u8,
        submitted_at_ms: u64,
    }

    // ─── Public functions ───────────────────────────────────────────────────────

    /// FeedbackRegistry を作成して shared object として公開する。
    /// デプロイ時に一度だけ呼ぶ (init 相当)。
    public fun create_registry(ctx: &mut TxContext) {
        let registry = FeedbackRegistry {
            id: object::new(ctx),
            entries: table::new(ctx),
        };
        transfer::share_object(registry);
    }

    /// 閲覧者が Capsule に対してフィードバックを追加する。
    /// `capsule_id` は `sui::object::id(&capsule)` で取得する。
    /// Capsule 自体への参照は不要なので、所有者でなくても呼べる。
    public fun attach_feedback(
        registry: &mut FeedbackRegistry,
        capsule_id: ID,
        walrus_blob_id: String,
        seal_policy_id: String,
        viewer_tier: u8,
        outcome: u8,
        clock: &Clock,
    ) {
        let submitted_at_ms = clock.timestamp_ms();
        let fb = FeedbackRef {
            walrus_blob_id,
            seal_policy_id,
            viewer_tier,
            outcome,
            submitted_at_ms,
        };

        if (table::contains(&registry.entries, capsule_id)) {
            table::borrow_mut(&mut registry.entries, capsule_id).push_back(fb);
        } else {
            table::add(&mut registry.entries, capsule_id, vector[fb]);
        };

        event::emit(FeedbackSubmittedEvent {
            registry_id: object::id(registry),
            capsule_id,
            viewer_tier,
            outcome,
            submitted_at_ms,
        });
    }

    // ─── View functions ────────────────────────────────────────────────────────

    public fun feedback_count(registry: &FeedbackRegistry, capsule_id: ID): u64 {
        if (table::contains(&registry.entries, capsule_id)) {
            table::borrow(&registry.entries, capsule_id).length()
        } else {
            0
        }
    }

    /// フィードバック一覧を返す。capsule_id が未登録の場合は abort する。
    /// 呼び出し前に feedback_count > 0 を確認すること。
    public fun get_feedback(registry: &FeedbackRegistry, capsule_id: ID): &vector<FeedbackRef> {
        table::borrow(&registry.entries, capsule_id)
    }

    public fun viewer_tier(fb: &FeedbackRef): u8    { fb.viewer_tier }
    public fun outcome(fb: &FeedbackRef): u8         { fb.outcome }
    public fun walrus_blob_id(fb: &FeedbackRef): &String { &fb.walrus_blob_id }
}
