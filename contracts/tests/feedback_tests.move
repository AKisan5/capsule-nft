module one_capsule::feedback_tests {
    use std::string;
    use sui::clock;
    use sui::test_scenario;
    use one_capsule::capsule::{Self, Capsule};
    use one_capsule::feedback::{Self, FeedbackRegistry};

    // ─── Constants ─────────────────────────────────────────────────────────────

    const CREATOR:  address = @0xCAFE;
    const VIEWER_A: address = @0xAAAA;
    const VIEWER_B: address = @0xBBBB;
    const TIMESTAMP_MS: u64 = 1_714_689_600_000;

    // ─── Helpers ────────────────────────────────────────────────────────────────

    fun mint_capsule(scenario: &mut test_scenario::Scenario, clk: &clock::Clock) {
        capsule::mint(
            string::utf8(b"blob_photo_001"),
            string::utf8(b"highlight"),
            vector[string::utf8(b"KO")],
            string::utf8(b"free text"),
            string::utf8(b"positive"),
            string::utf8(b"震撼"),
            string::utf8(b"direct"),
            string::utf8(b"原液メモ"),
            string::utf8(b"ONE 170"),
            string::utf8(b"Rodtang"),
            clk,
            test_scenario::ctx(scenario),
        );
    }

    // ─── Tests ─────────────────────────────────────────────────────────────────

    /// create_registry が shared object を生成することを確認する
    #[test]
    fun test_registry_is_shared() {
        let mut scenario = test_scenario::begin(CREATOR);
        let clk = clock::create_for_testing(test_scenario::ctx(&mut scenario));

        test_scenario::next_tx(&mut scenario, CREATOR);
        feedback::create_registry(test_scenario::ctx(&mut scenario));

        // shared object は誰からでも取得できる
        test_scenario::next_tx(&mut scenario, VIEWER_A);
        assert!(test_scenario::has_most_recent_shared<FeedbackRegistry>(), 0);

        clock::destroy_for_testing(clk);
        test_scenario::end(scenario);
    }

    /// attach_feedback が feedback_count を増加させることを確認する
    #[test]
    fun test_attach_feedback_increments_count() {
        let mut scenario = test_scenario::begin(CREATOR);
        let mut clk = clock::create_for_testing(test_scenario::ctx(&mut scenario));
        clock::set_for_testing(&mut clk, TIMESTAMP_MS);

        // Registry 作成
        test_scenario::next_tx(&mut scenario, CREATOR);
        feedback::create_registry(test_scenario::ctx(&mut scenario));

        // Capsule ミント
        test_scenario::next_tx(&mut scenario, CREATOR);
        mint_capsule(&mut scenario, &clk);

        // capsule_id を取得
        test_scenario::next_tx(&mut scenario, CREATOR);
        let cap = test_scenario::take_from_sender<Capsule>(&scenario);
        let cap_id = object::id(&cap);
        test_scenario::return_to_sender(&scenario, cap);

        // 登録前は 0
        test_scenario::next_tx(&mut scenario, VIEWER_A);
        let registry = test_scenario::take_shared<FeedbackRegistry>(&scenario);
        assert!(feedback::feedback_count(&registry, cap_id) == 0, 1);
        test_scenario::return_shared(registry);

        // VIEWER_A がフィードバックを追加
        test_scenario::next_tx(&mut scenario, VIEWER_A);
        let mut registry = test_scenario::take_shared<FeedbackRegistry>(&scenario);
        feedback::attach_feedback(
            &mut registry,
            cap_id,
            string::utf8(b"fb_blob_001"),
            string::utf8(b"seal_policy_001"),
            1, // intermediate
            0, // communicated
            &clk,
        );
        test_scenario::return_shared(registry);

        // count が 1 になっている
        test_scenario::next_tx(&mut scenario, VIEWER_A);
        let registry = test_scenario::take_shared<FeedbackRegistry>(&scenario);
        assert!(feedback::feedback_count(&registry, cap_id) == 1, 2);
        test_scenario::return_shared(registry);

        clock::destroy_for_testing(clk);
        test_scenario::end(scenario);
    }

    /// 複数の閲覧者が同じ Capsule にフィードバックを追加できる
    #[test]
    fun test_multiple_viewers_append() {
        let mut scenario = test_scenario::begin(CREATOR);
        let mut clk = clock::create_for_testing(test_scenario::ctx(&mut scenario));
        clock::set_for_testing(&mut clk, TIMESTAMP_MS);

        test_scenario::next_tx(&mut scenario, CREATOR);
        feedback::create_registry(test_scenario::ctx(&mut scenario));

        test_scenario::next_tx(&mut scenario, CREATOR);
        mint_capsule(&mut scenario, &clk);

        test_scenario::next_tx(&mut scenario, CREATOR);
        let cap = test_scenario::take_from_sender<Capsule>(&scenario);
        let cap_id = object::id(&cap);
        test_scenario::return_to_sender(&scenario, cap);

        // VIEWER_A のフィードバック
        test_scenario::next_tx(&mut scenario, VIEWER_A);
        let mut registry = test_scenario::take_shared<FeedbackRegistry>(&scenario);
        feedback::attach_feedback(
            &mut registry, cap_id,
            string::utf8(b"fb_blob_A"), string::utf8(b"policy_A"),
            0, 1, &clk,
        );
        test_scenario::return_shared(registry);

        // VIEWER_B のフィードバック
        test_scenario::next_tx(&mut scenario, VIEWER_B);
        let mut registry = test_scenario::take_shared<FeedbackRegistry>(&scenario);
        feedback::attach_feedback(
            &mut registry, cap_id,
            string::utf8(b"fb_blob_B"), string::utf8(b"policy_B"),
            2, 0, &clk,
        );
        test_scenario::return_shared(registry);

        // count が 2
        test_scenario::next_tx(&mut scenario, CREATOR);
        let registry = test_scenario::take_shared<FeedbackRegistry>(&scenario);
        assert!(feedback::feedback_count(&registry, cap_id) == 2, 3);

        // フィードバック内容を検証
        let fbs = feedback::get_feedback(&registry, cap_id);
        assert!(feedback::viewer_tier(fbs.borrow(0)) == 0, 4);
        assert!(feedback::outcome(fbs.borrow(0)) == 1, 5);
        assert!(feedback::viewer_tier(fbs.borrow(1)) == 2, 6);
        assert!(feedback::outcome(fbs.borrow(1)) == 0, 7);

        test_scenario::return_shared(registry);
        clock::destroy_for_testing(clk);
        test_scenario::end(scenario);
    }

    /// creator 所有の Capsule はフィードバックと分離されている (相互干渉なし)
    #[test]
    fun test_feedback_does_not_affect_capsule() {
        let mut scenario = test_scenario::begin(CREATOR);
        let mut clk = clock::create_for_testing(test_scenario::ctx(&mut scenario));
        clock::set_for_testing(&mut clk, TIMESTAMP_MS);

        test_scenario::next_tx(&mut scenario, CREATOR);
        feedback::create_registry(test_scenario::ctx(&mut scenario));

        test_scenario::next_tx(&mut scenario, CREATOR);
        mint_capsule(&mut scenario, &clk);

        test_scenario::next_tx(&mut scenario, CREATOR);
        let cap = test_scenario::take_from_sender<Capsule>(&scenario);
        let cap_id = object::id(&cap);
        test_scenario::return_to_sender(&scenario, cap);

        // VIEWER_A がフィードバック追加
        test_scenario::next_tx(&mut scenario, VIEWER_A);
        let mut registry = test_scenario::take_shared<FeedbackRegistry>(&scenario);
        feedback::attach_feedback(
            &mut registry, cap_id,
            string::utf8(b"fb_blob"), string::utf8(b"policy"),
            1, 2, &clk,
        );
        test_scenario::return_shared(registry);

        // creator の Capsule は変わらず step3_memo が原液のまま
        test_scenario::next_tx(&mut scenario, CREATOR);
        let cap = test_scenario::take_from_sender<Capsule>(&scenario);
        assert!(*capsule::step3_memo(&cap) == string::utf8(b"原液メモ"), 8);
        test_scenario::return_to_sender(&scenario, cap);

        clock::destroy_for_testing(clk);
        test_scenario::end(scenario);
    }
}
