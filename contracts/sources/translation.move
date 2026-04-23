/// AI 翻訳キャッシュモジュール。
///
/// 設計: 翻訳は Capsule オブジェクトの dynamic field として保持する。
/// キー "translation_cache" に VecMap<u8 (viewer_tier), TranslationRef> を格納し、
/// ティアごとに最新の翻訳を upsert する。
/// `cache_translation` は &mut Capsule を要求するため、
/// creator (Capsule の所有者) のみが呼び出せる。
module one_capsule::translation {
    use std::string::String;
    use sui::dynamic_field as df;
    use sui::vec_map::{Self, VecMap};
    use sui::clock::Clock;
    use one_capsule::capsule::Capsule;

    // ─── Constants ─────────────────────────────────────────────────────────────

    const TRANSLATION_KEY: vector<u8> = b"translation_cache";

    // ─── Structs ───────────────────────────────────────────────────────────────

    /// viewer_tier 別の翻訳参照。翻訳本文は Walrus に保存する。
    public struct TranslationRef has store, copy, drop {
        /// Walrus に保存した翻訳テキストの Blob ID
        walrus_blob_id: String,
        /// 対象ティア: 0=beginner / 1=intermediate / 2=hardcore
        viewer_tier: u8,
        /// 生成日時 (ms)
        generated_at_ms: u64,
    }

    // ─── Public functions ───────────────────────────────────────────────────────

    /// viewer_tier に対応する翻訳を Capsule の dynamic field にキャッシュ (upsert)。
    /// Capsule の所有者のみが呼べる (&mut Capsule が必要)。
    public fun cache_translation(
        capsule: &mut Capsule,
        walrus_blob_id: String,
        viewer_tier: u8,
        clock: &Clock,
    ) {
        let t_ref = TranslationRef {
            walrus_blob_id,
            viewer_tier,
            generated_at_ms: clock.timestamp_ms(),
        };

        let uid = one_capsule::capsule::uid_mut(capsule);

        if (df::exists_(uid, TRANSLATION_KEY)) {
            let cache: &mut VecMap<u8, TranslationRef> = df::borrow_mut(uid, TRANSLATION_KEY);
            if (vec_map::contains(cache, &viewer_tier)) {
                // 同 tier の翻訳を更新
                *vec_map::get_mut(cache, &viewer_tier) = t_ref;
            } else {
                vec_map::insert(cache, viewer_tier, t_ref);
            }
        } else {
            // 初回: VecMap を新規作成して dynamic field として追加
            let mut cache = vec_map::empty<u8, TranslationRef>();
            vec_map::insert(&mut cache, viewer_tier, t_ref);
            df::add(uid, TRANSLATION_KEY, cache);
        }
    }

    // ─── View functions ────────────────────────────────────────────────────────

    /// 指定 tier の翻訳キャッシュを返す。未キャッシュは option::none()。
    public fun get_translation(capsule: &Capsule, viewer_tier: u8): Option<TranslationRef> {
        let uid = one_capsule::capsule::uid_ref(capsule);
        if (!df::exists_(uid, TRANSLATION_KEY)) return option::none();
        let cache: &VecMap<u8, TranslationRef> = df::borrow(uid, TRANSLATION_KEY);
        if (vec_map::contains(cache, &viewer_tier)) {
            option::some(*vec_map::get(cache, &viewer_tier))
        } else {
            option::none()
        }
    }

    public fun walrus_blob_id(t: &TranslationRef): &String { &t.walrus_blob_id }
    public fun viewer_tier(t: &TranslationRef): u8          { t.viewer_tier }
    public fun generated_at_ms(t: &TranslationRef): u64     { t.generated_at_ms }
}
