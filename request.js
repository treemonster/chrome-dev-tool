var Request = function() {
    var HandleRequest = function() {
        query_erp("#code-review-operator");
        query_erp("#test-operator", 5);
        query_erp("#product-operator", 5);
        query_erp("#buried-test-operator", 5);
        query_erp("#ui-operator", 5);
        query_erp("#permission-erp", 5);
        var isNew = true;
        apply_type_change();
        if($('#req-name').val() != ''){
            isNew = false;
        }
        $("body").on("click", ".close-item", function () {
            $(this).parent().remove();
        });

        $("#cancel-apply-request").click(function() {
            window.history.go(-1);
        });

        $("#return_to_list").click(function() {
            if(window.history.length==1 || window.history.length==2){
                window.location.href = "/Integration/";
            }
            else {
               window.history.go(-1);
            }
        });

        //级联版本和平台
        var version = $("#version_client").val();
        if(version != 0){
            var target_platform = $("#version_client").data("platform");
            link_version_platform(version, target_platform);
        }
        else{
            $('#platform_container').hide();
        }

        $('#version_client').change(function() {
            var version = $(this).val();
            if(version == 0){
                $('#platform_container').hide();
                if($('#apply_type').val() == 3){
                    $('#permission-erp-container').hide();
                }
                return;
            }else{
                $('#platform_container').show();
            }
            link_version_platform(version, 0);
        });

        $('#module_id').change(function() {
            var options = $(this).val();
            var jacp_card_id = $('#jacp_card_id').val();
            var module_white_list = $('#module_'+options).attr('data-value');
            showSelfTestSwitch(jacp_card_id);
            showSelfTest();
            if(module_white_list == 2) {
                $('.self_test_switch').hide();
            }
        });

        function link_version_platform(version, platform) {
            $.ajax({
                url: '/MSP/Version/Get_platform_by_version',
                type: 'POST',
                cache: false,
                data: {
                    version:version
                }, 
                success:function(data) {
                    if (data.result == 1) {
                        $('#platform')
                            .find('option')
                            .remove()
                            .end();
                        $.each(data.info, function(id, value) {
                            if (platform) {
                                var target_platform = platform;
                            }
                            else {
                                var target_platform = data.info[0].platform;
                            }
                            $('#platform').append('<option value="'+value.platform+'">'+value.name+'</option>')
                            .val(target_platform);
                        });
                        
                    }
                    else {
                        console.log('fail to get platform by version, use default ones');
                        return false;
                    }
                    var apply_type = $('#apply_type').val();
                    if(apply_type == 1){
                        platform = $('#platform').val();
                        var target_repo = $("#platform").data("repo");
                        link_platform_repo(platform,target_repo);
                    }
                },
                error:function(XMLHttpRequest,textStatus, errorThrown) { 
                    console.log("get_platform_by_version失败，"+XMLHttpRequest+", "+textStatus+", "+errorThrown);
                }
            });
        }

        //级联平台和仓库
        $('#platform').change(function() {
            var platform = $(this).val();
            var apply_type = $('#apply_type').val();
            if(platform == 2 && apply_type == 1) {//iOS
                $('.ios_side').show();
                $('#code-repository-container').hide();
                $("#branch-name-container").hide();
			}
			else{//非iOS
                if(apply_type == 1){//安卓
                    link_platform_repo(platform, 0);
                    $('#code-repository-container').show();
                }else{//rn
                    $('#code-repository-container').hide();
                }
				$('.ios_side').hide();
			}
        });

        $('#integration_permission_type').change(function(){
			if($(this).val() == 'ibiu'){
                $("#branch-name-container").hide();
            }else{
                $("#branch-name-container").show();
            }
		});

        $('#apply_type').change(function() {
            apply_type_change();
        });

        $('#sync_bamboo').click(function(){
            $('#sync_from_bamboo_modal').modal('show');
        });

        $('#sync_from_bamboo').click(function(){
            load_from_bamboo();
        });

        $(".query-operator").click(function() {
            var target = $(this).data("target-item");
            var target_div = target+'-div';
            var target_ul = target+'-ul';
            var target_container = target+'-container';
            $('#'+target_container).parsley().validate();

            $body = $("body");
            $body.addClass("loading");
            var operator_erp = $("#"+target).val();
            operator_erp = $.trim(operator_erp);
            if (operator_erp.length == 0) {
                $body.removeClass("loading");
                return false;
            }
            $.ajax({
                url: '/user/get_user_by_erp',
                type: 'POST',
                cache: false,
                data: {erp:operator_erp},
                success:function(data) { 
                    $body.removeClass("loading");
                    $("#"+target_div).removeClass("hide");
                    if(data.result == 1) {
                        $("#"+target).val("");
                        $("."+target_ul).append('<li class="filter-list-item" data-erp="'+data.info.user_name+'" data-name="'+data.info.chinese_name+'" data-email="'+data.info.email+'">\
                                            '+data.info.chinese_name+'\
                                            <i class="fa fa-close close-item"></i>\
                                        </li>');
                    } else {
                        alert(data.info);
                        return false;
                    }
                }
            });
        });

        $('input:radio[name="involve_server"]').on('ifChecked', function(){
            var involve_server = $(this).val();
            if(involve_server == 0){
                $('#server-apply-number').val("");
                $('#server-apply-number').attr("disabled","disabled");
            }else{
                var jacp_id = $('#jacp_card_id').val();
                if(jacp_id > 0){
                    $.ajax({ 
                        url: '/Integration/get_related_request',
                        type: 'POST',
                        data: {jacp_id : jacp_id},
                        success:function(data) {
                            if (data.result == 1) {
                                var request_list_string = "";
                               for(i = 0; i < data.info.length; i++){
                                    request_list_string = request_list_string + data.info[i].request_no + " ";
                               }
                               $('#server-apply-number').attr('placeholder', "如:" + $.trim(request_list_string));
                               $('#server-apply-number').attr('title', "此行云卡片相关的服务端提测编号：" + $.trim(request_list_string));
                            }
                        }, 
                        error:function(XMLHttpRequest,textStatus, errorThrown) { 
                            toastr.error("无法获取该行云卡片所关联的服务端提测编号!");
                        }
                    });
                }
                $('#server-apply-number').removeAttr("disabled");
            }
        });

        $('input:radio[name="involve_product"]').on('ifChecked', function(){
            var involve_product = $(this).val();
            if(involve_product == 0){
                $('#product-operator').tagsinput('removeAll');
                $('#product-operator').attr("disabled","disabled");
                $('#product_input').hide();
            }else{
                $('#product-operator').removeAttr("disabled");
                $('#product_input').show();
            }
        });

        $('input:radio[name="involve_buried_test"]').on('ifChecked', function(){
            var involve_buried_test = $(this).val();
            if(involve_buried_test == 0){
                $('#buried-test-operator').tagsinput('removeAll');                
                $('#buried-test-operator').prop("disabled","disabled");
                $('#buried_input').hide();
            }else{
                $('#buried-test-operator').removeAttr("disabled");
                $('#buried_input').show();
            }
        });

        $('input:radio[name="involve_ui"]').on('ifChecked', function(){
            var involve_ui = $(this).val();
            if(involve_ui == 0){
                $('#ui-operator').tagsinput('removeAll');
                $('#ui-operator').attr("disabled","disabled");
                $('#ui_input').hide();
            }else{
                $('#ui-operator').removeAttr("disabled");
                $('#ui_input').show();
            }
        });
        $('input:radio[name="involve_info"]').on('ifChecked', function(){
            var status = $(this).val();
            if(status == 0){
                $('#user_input').hide();
               
            }else{
                $('#user_input').show();
            }
        });
        $('input:radio[name="others_collect"]').on('ifChecked', function(){
            var status = $(this).val();
            if(status == 0){
                $('#others_input').hide();
            }else{
                $('#others_input').show();
            }
        });
        $('input:radio[name="range"]').on('ifChecked', function(){
            var status = $(this).val();
            if(status == 0){
                $('#range_input').hide();
            }else{
                $('#range_input').show();
            }
        });
        $('input:radio[name="consent"]').on('ifChecked', function(){
            var status = $(this).val();
            if(status == 0){
                $('#consent_input').hide();
            }else{
                $('#consent_input').show();
            }
        });
        $('input:radio[name="Authority"]').on('ifChecked', function(){
            var status = $(this).val();
            if(status == 0){
                $('#Authority_input').hide();
            }else{
                $('#Authority_input').show();
            }
        });
        $('input:radio[name="setting"]').on('ifChecked', function(){
            var status = $(this).val();
            if(status == 0){
                $('#setting_input').hide();
            }else{
                $('#setting_input').show();
            }
        });
        $("#test-package-url").blur(function(){
            var matched = checkTestUrl();
            if(!matched){
                $('#error_test_package').show();
            }else{
                $('#error_test_package').hide();
            }
        });

		function checkTestUrl() {
		/**
		 * 校验输入测试包地址是否正确
		 * */
            var apply_type = $("#apply_type").val();
            if(apply_type == 1){
                var reg = /^http:\/\/storage.jd.local\/com.bamboo/;
                var test_package_url = $.trim($("#test-package-url").val());
                matched = test_package_url.match(reg);
            }else{
                matched = true;
            }
			return matched;
        }

        $("body").on("click", "#submit-apply-request", function() {
            $body = $("body");
            $body.addClass("loading");
            var apply_request = new FormData();

            var id = $(this).data("id");
            var build_id = $(this).data("build_id");
            apply_request.append('id', id);

            var jacp_required = parseInt($('#jacp_required').val());
            apply_request.append('jacp_required', jacp_required);

            if (!$('#req-name-container').parsley().validate()) {
                $body.removeClass("loading");
                return false;
            }
            var req_name = $.trim($("#req-name").val());
            apply_request.append('req_name', req_name);

//          Modified by sgzs for swiching server side and client side form by the value of "apply_type"
            var apply_type = $("#apply_type").val();
            apply_request.append('apply_type',apply_type);

            if(apply_type == 99){
                other_app = $('#other_app').val();
                if(other_app == 0){
                    alert("请选择APP名称");
                    $body.removeClass("loading");
                    return false;
                }
                apply_request.append('app_id', other_app);
            }

            var module_id = $("#module_id").val();
            if (module_id == 0) {
                alert("请选择模块");
                $body.removeClass("loading");
                return false;
            }
            apply_request.append('module_id', module_id);

            if(!id){
                var is_copy_request = $('#request_copy_lable').val();
                if(apply_type % 2 == 1){
                    apply_request.append('test_content', is_copy_request);
                }else{
                    apply_request.append('assessable_risk', is_copy_request);
                }
            }

            if (apply_type % 2 == 1){
                
                if(1 == apply_type || apply_type == 3){
                    var version  = $("#version_client").val();
                    apply_request.append('version', version);
                }

                if(1 == apply_type || 3 == apply_type){
                    if($('version_client').val() != 0){
                        var platform = $("#platform").val();
                        apply_request.append('platform', platform);
                    }
                }
                if(1 == apply_type){
                    if($.trim($("#test-package-url").val()) != $.trim($("#bamboo-package-url").val())){
                        build_id = "";
                    }
                    if(build_id){
                        apply_request.append('affect_range', build_id);
                        apply_request.append('interface_name', $('#bamboo_url').val());
                        apply_request.append('test_data', $('#qtcode_url').val());
                    }else{
                        apply_request.append('affect_range', "");
                        apply_request.append('interface_name', "");
                        apply_request.append('test_data', "");
                    }
                }

				integration_permission_type = $('#integration_permission_type').val();
                var branch_name = $.trim($("#branch-name").val());
                apply_request.append('branch_name', branch_name);
                if( 1 == apply_type){
                	if(platform == 2) {
                        //校验客户端iOS类型的权限类型，必填，且必须是ibiu或git
                        if (integration_permission_type != 'ibiu' && integration_permission_type != 'git') {//既不是ibiu也不是代码库，则错误
                            $body.removeClass("loading");
                            return false;
                        }
						apply_request.append('integration_permission_type', integration_permission_type);
                    }
                    else{//android，需要校验代码库这一字段，iOS不用了
						if (!$('#code-repository-container').parsley().validate()) {
							// console.log('abnormal repo');
							$body.removeClass("loading");
							return false;
						}
                        var code_repository = $("#code-repository").val();
                        apply_request.append('code_repository', code_repository);    
					}
                }
                var jira_no = $.trim($("#jira_no").val());
                apply_request.append('jira_no', jira_no);

                if (!$('#change-related-module').parsley().validate()) {
                    $body.removeClass("loading");
                    return false;
                }
                var change_related_module = $.trim($("#change-related-module").val());
                apply_request.append('change_related_module', change_related_module);

                if (!$('#assessable-risk').parsley().validate()) {
                    $body.removeClass("loading");
                    return false;
                }
                var assessable_risk = $.trim($("#assessable-risk").val());
                apply_request.append('assessable_risk', assessable_risk);
            }

            if(apply_type % 2 == 0){

                var req_type  = $("#req_type").val();
                apply_request.append('req_type', req_type);

                var expect_online_date  = $("#expect_online_date").val();
                apply_request.append('expect_online_date', expect_online_date);

                if(apply_type != 6){
                    var version  = $("#version_server").val();
                    apply_request.append('version', version);
                }
                
                var test_content  = $("#test_content").val();
                apply_request.append('test_content', test_content);

                if (!$('#modification_explanation').parsley().validate()) {
                    $body.removeClass("loading");
                    return false;
                }
                var modification_explanation = $.trim($("#modification_explanation").val());
                apply_request.append('modification_explanation', modification_explanation);

                if (!$('#affect_range').parsley().validate()) {
                    $body.removeClass("loading");
                    return false;
                }
                var affect_range = $.trim($("#affect_range").val());
                apply_request.append('affect_range', affect_range);
                if ($('input:radio[name="degrade_switch_apply"]').is(":checked")){
                    var degrade_switch = $('input:radio[name="degrade_switch_apply"]:checked').val();
                    apply_request.append('degrade_switch',degrade_switch);
                }else{
                    alert("请选择是否有降级开关！");
                    $body.removeClass("loading");
                    return false;
                }

                if ($('input:radio[name="pressure_test"]').is(":checked")){
                    var pressure_test = $('input:radio[name="pressure_test"]:checked').val();
                    apply_request.append('pressure_test',pressure_test);
                }else{
                    alert("请选择上线前是否要压测");
                    $body.removeClass("loading");
                    return false;
                }

                if (!$('#interface_name').parsley().validate()) {
                    $body.removeClass("loading");
                    return false;
                }
                var interface_name = $.trim($("#interface_name").val());
                apply_request.append('interface_name', interface_name);

                if (!$('#test_data').parsley().validate()) {
                    $body.removeClass("loading");
                    return false;
                }
                var test_data = $.trim($("#test_data").val());
                apply_request.append('test_data', test_data);

                if (!$('#test_address').parsley().validate()) {
                    $body.removeClass("loading");
                    return false;
                }
                var test_address = $.trim($("#test_address").val());
                apply_request.append('test_address', test_address);

                if (!$('#code_branch').parsley().validate()) {
                    $body.removeClass("loading");
                    return false;
                }
                var code_branch = $.trim($("#code_branch").val());
                apply_request.append('code_branch', code_branch);

            }

            var review_result = $.trim($("#review_result").val());
            if(review_result == '-1'){
                $body.removeClass("loading");
                alert("请选择Code Review结果");
                return false;
            }
            apply_request.append('review_result', review_result);
            
            var self_test = $.trim($("#self_test").val());
            apply_request.append('self_test', self_test);

            var self_test_url = $.trim(self_test_url_map[run_id_dom.val()]);
            var run_id = $.trim($("#run_id").val());
			jacp_card_id = $('#jacp_card_id').val();
			if(jacp_card_id && jacp_card_id>0 && self_test == 1 && run_id==0){//选择了行云卡片，且需要自测，但自测集或者自测url是空的
                var module_white_list = $('#module_'+module_id).attr('data-value');
                if(module_white_list == 2){
                    alert('请选择开发自测集，若无，请先在穹天新建自测集！');
                }
                else{
                    alert('选择了需要自测，但未填写自测url。请填写自测url，或选择无需自测');

                }
				$body.removeClass("loading");
				return false;
			}
			apply_request.append('run_id', run_id);
            apply_request.append('self_test_url', self_test_url);

            var memo = $.trim($("#request-memo").val());
            apply_request.append('memo', memo);

            //Code Review人
            var code_review_operator = get_operator("code-review-operator", "Code Review人", true);
            if (!code_review_operator) {
                $body.removeClass("loading");
                return false;
            }

            apply_request.append('code_review_operator', JSON.stringify(code_review_operator));

            if ( 1 == apply_type || 3 == apply_type){
                if (!$('#test-package-url-container').parsley().validate()) {
                    $body.removeClass("loading");
                    return false;
                }
                if( 1 == apply_type && !checkTestUrl()){
                    alert('根据移动安全发布合规性要求，所有提测需提供有效测试包地址，否则无法完成提测，有问题请加群6617013');
                    $body.removeClass("loading");
                    return false;
                }
                var test_package_url = $.trim($("#test-package-url").val());
                apply_request.append('test_package_url', test_package_url);
            }

            //测试经办人
            var test_operator = get_operator("test-operator", "测试经办人", true);
            if (!test_operator) {
                $body.removeClass("loading");
                return false;
            }
            apply_request.append('test_operator', JSON.stringify(test_operator));

            if(apply_type != 2 && apply_type != 6){
                if ($('input:radio[name="involve_server"]').is(":checked")){
                    var involve_server = $('input:radio[name="involve_server"]:checked').val();
                    apply_request.append('involve_server',involve_server);
                    if(involve_server == 1){
                        if($('#involve_server_group').is(":hidden")){
                            ;
                        }else{
                            if (!$('#server-apply-number').parsley().validate()) {
                                $body.removeClass("loading");
                                return false;
                            }else{
                                var server_apply_number = $.trim($("#server-apply-number").val());
                                var exist_server_number = check_number_exist(server_apply_number);
                                if(exist_server_number.result){
                                    if(exist_server_number.info[0].integration_status == 4) {
                                        apply_request.append('server_online', 1);
                                    }
                                    apply_request.append('server_apply_number', server_apply_number);
                                }else{
                                    $body.removeClass("loading");
                                    alert("服务端提测申请编号不存在!");
                                    return false;
                                }
                            }
                        }
                    }else{
                        apply_request.append('server_apply_number', '');
                    }
                }else{
                    alert("请选择是否涉及服务端！");
                    $body.removeClass("loading");
                    return false;
                }
            }

            if ($('input:radio[name="involve_product"]').is(":checked")){
                var involve_product = $('input:radio[name="involve_product"]:checked').val();
                apply_request.append('involve_product',involve_product);
                if(involve_product == 1){
                    var product_operator = get_operator("product-operator", "产品经办人", true);
                    apply_request.append('product_operator', JSON.stringify(product_operator));
                    if (!product_operator) {
                        $body.removeClass("loading");
                        return false;
                    }
                }else if(involve_product == 0){
                    // add defalut product operator 
                    apply_request.append('product_operator', '[{"real_name":"产品经办人","user_name":"product_operator","email":"product_operator@jd.com","org_name":"product_operator"}]');
                }
            }else{
                alert("请选择是否涉产品！");
                $body.removeClass("loading");
                return false;
            }

            if ($('input:radio[name="involve_buried_test"]').is(":checked")){
                var involve_buried_test = $('input:radio[name="involve_buried_test"]:checked').val();
                apply_request.append('involve_buried_test',involve_buried_test);
                if(involve_buried_test == 1){
                    var buried_test_operator = get_operator("buried-test-operator", "埋点测试经办人", true);
                    apply_request.append('buried_test_operator', JSON.stringify(buried_test_operator));
                    if (!buried_test_operator) {
                        $body.removeClass("loading");
                        return false;
                    }
                }else if(involve_buried_test == 0){
                    // add defalut buried test operator 
                    apply_request.append('buried_test_operator', '[{"real_name":"埋点测试经办人","user_name":"buried_test_operator","email":"buried_test_operator@jd.com","org_name":"buried_test_operator"}]');
                }
            }else{
                alert("请选择是否涉埋点！");
                $body.removeClass("loading");
                return false;
            }

            if ($('input:radio[name="involve_ui"]').is(":checked")){
                var involve_ui = $('input:radio[name="involve_ui"]:checked').val();
                apply_request.append('involve_ui',involve_ui);
                
                if(involve_ui == 1){
                    var ui_operator = get_operator("ui-operator", "UI经办人", true);
                    apply_request.append('ui_operator', JSON.stringify(ui_operator));
                    if (!ui_operator) {
                        $body.removeClass("loading");
                        return false;
                    }
                }
                else if(involve_ui == 0){
                    // add defalut ui operator 
                    apply_request.append('ui_operator', '[{"real_name":"UI经办人","user_name":"ui_operator","email":"ui_operator@jd.com","org_name":"ui_operator"}]');
                }                
            }else{
                alert("请选择是否涉UI！");
                $body.removeClass("loading");
                return false;
            }
            
            //jacp card
            var jacp_card_id = $("#jacp_card_id").val();
            apply_request.append('jacp_card_id', jacp_card_id);

            if(jacp_required){
                if(!jacp_card_id || jacp_card_id == -1){
                    alert("平台业务研发部的提测需求需从行云录入！");
                    $body.removeClass("loading");
                    return false;
                }
            }

            if( apply_type == 1 || apply_type == 3){
                //申请集成权限ERP人
                if(!(apply_type == 3 && $('#version_client').val() == 0)){
                    if (!$('#permission-erp-container').parsley().validate()) {
                        $body.removeClass("loading");
                        return false;
                    }
                    var integration_permission_erp = get_operator("permission-erp", "申请集成权限ERP", true);
                    if (!integration_permission_erp) {
                        $body.removeClass("loading");
                        return false;
                    }
                    apply_request.append('integration_permission_erp', JSON.stringify(integration_permission_erp));
                }
                if(apply_type == 1) {

					var involve_info = $('input:radio[name="involve_info"]:checked').val();
					if (involve_info == 1) {
						apply_request.append('involve_privacy', involve_info);
						var others_collect = $("#others_collect").val();
						if (!others_collect) {
							alert("请填写详细说明！");
							$body.removeClass("loading");
							return false;
						}
						apply_request.append('others_collect', others_collect);

						var privacy_range = $("#range").val();
						if (!privacy_range) {
							alert("请填写详细说明！");
							$body.removeClass("loading");
							return false;
						}
						apply_request.append('privacy_range', privacy_range);

						var user_consent = $("#consent").val();
						if (!user_consent) {
							alert("请填写详细说明！");
							$body.removeClass("loading");
							return false;
						}
						apply_request.append('user_consent', user_consent);

						var claim_authority = $("#Authority").val();
						if (!claim_authority) {
							alert("请填写详细说明！");
							$body.removeClass("loading");
							return false;
                        }
                        
						apply_request.append('claim_authority', claim_authority);
						var system_set = $("#setting").val();
						if (!system_set) {
							alert("请填写详细说明！");
							$body.removeClass("loading");
							return false;
                        }

						apply_request.append('system_set', system_set);
					}
				}
            }

            var action = "do_edit";
            if(id == 0) {
                var action = "do_apply";
            }
        
            $.ajax({
                url: '/Integration/do_handle',
                type: 'POST',
                cache: false,
                data: apply_request,
                enctype:"multipart/form-data",
                processData: false,
                contentType: false,
                success:function(data) { 
                    $body.removeClass("loading");
                    if(data.result == 1) {
                        alert(data.info);
                        window.history.go(-1);
                    } else {
                        alert(data.info);
                        return false;
                    }
                }
            });
        });

        function check_number_exist(server_apply_number){
            result = {result: false, info:""};
            $.ajax({
                url: '/Integration/check_server_number',
                type: 'POST',
                cache: false,
                async: false,
                data: {number:server_apply_number},
                enctype:"multipart/form-data",
                success:function(data) {
                    result = data;
                }
            });
            return result;
        };

        function get_operator(element_name, element_chinese_name, required) {
            var $element = $("#"+element_name);

            if (!$element.data('tagsinput')) {
                return;
            }
            var selected_operator = $element.tagsinput('items');
            if (required) {
                if (selected_operator.length == 0) {
                    alert(element_chinese_name+"不能为空");
                    return false;
                }
            }
            return selected_operator;
        }
    };

    var HandleView = function () {
        $("#edit_request").click(function() {
            var id = $(this).data("id");
            window.location.href = "/Integration/Edit/"+id;
        });

        $("#copy_request").click(function() {
            var id = $(this).data("id");
            window.location.href = "/Integration/Copy/"+id;
        });

        $("#return_to_list").click(function() {
            if(window.history.length==1 || window.history.length==2){
                window.location.href = "/Integration/";
            }
            else {
               window.history.go(-1);
            }
        });
    };

    var HandleBackTop = function () {
        $(document).on( 'scroll', function(){
            if ($(window).scrollTop() > 100) {
                $('.scroll-top-wrapper').addClass('show');
            } else {
                $('.scroll-top-wrapper').removeClass('show');
            }
        });
     
        $('.scroll-top-wrapper').on('click', scrollToTop);
        function scrollToTop() {
            verticalOffset = typeof(verticalOffset) != 'undefined' ? verticalOffset : 0;
            element = $('body');
            offset = element.offset();
            offsetTop = offset.top;
            $('html, body').animate({scrollTop: offsetTop}, 300, 'linear');
        }
    };

    return {
        init: function() {
            HandleRequest();
        },
        view: function() {
            HandleView();
        },
        backTop: function() {
            HandleBackTop();
        }
    }
}();
function load_from_bamboo(){
    $body = $("body");
    $body.addClass("loading");
    if(!$('#build_id_container').parsley().validate()){
        $body.removeClass("loading");
        return false;
    }
    var build_info = new FormData();
    var build_id = $('#build_id').val();
    build_info.append('build_id', build_id);

    if($('#apply_type').val() != 1){
        $('#apply_type').val(1);
        apply_type_change();
    }
    $.ajax({
        url: '/Integration/get_bamboo_data',
        type: 'POST',
        cache: false,
        data: build_info,
        enctype:"multipart/form-data",
        processData: false,
        contentType: false,
        success:function(data) { 
            if(data.result == 0) {
                if(data.data.version != ""){
                    $('#version_client').val(data.data.version);
                }
                $('#platform').val(data.data.app_type);
                var platform = $('#platform').val();
                var repo_id = 0;
                if(data.data.git_repo_name != ""){
                    repo_id = data.data.git_repo_name;
                }
                link_platform_repo(platform, repo_id, false);
                $('#branch-name').val(data.data.branch);
                $('#self_test').val(1);
                $('#test-package-url').val(data.data.package_url);
                $('#bamboo-package-url').val(data.data.package_url);
                $('#bamboo_url').val(data.data.detail_url);
                $('#qtcode_url').val(data.data.qrcode_url);
                $('#bamboo_change_link').attr('href',data.data.change_log_url);
                $('#bamboo_change_log').show();
                $('#submit-apply-request').data('build_id', build_id);
                $body.removeClass("loading");
                $('#sync_from_bamboo_modal').modal('hide');
                toastr.success(data.message);
            } else {
                $body.removeClass("loading");
                toastr.error(data.message);
                return false;
            }
        }
    });
}


function link_platform_repo(platform, repo, sync_type = true) {
	if(platform == 2){
        //iOS，代码库不用显示了，获取代码库的判断留给后端去做
        $('.ios_side').show();
        $('#code-repository-container').hide();
		return;
	}
    $('.ios_side').hide();
    $('.ibiu_hide').show();//ios时，若选为ibiu了，则被隐藏起来了，所以改回安卓时得显示出来
    $('#code-repository-container').show();
	get_repo_by_platform(platform,repo,sync_type);
}


function get_repo_by_platform(platform,repo,sync_type = true){
	$.ajax({
		url: '/Config/Get_repo_by_platform',
		type: 'POST',
		cache: false,
		async: sync_type,
		data: {
			platform:platform
		},
		success:function(data) {
			if (data.result == 1) {
				$('#code-repository')
					.find('option')
					.remove()
					.end();
				$.each(data.info, function(id, value) {
					var repo_id = parseInt(value.id);
					var target_selected = "";
					if (repo) {
						if (repo.toString().length == 1) {
							if (repo_id == repo) {
								target_selected = "selected";
							}
						}
						else {
							var target_repo = repo.split(",");
							if (target_repo.indexOf(repo_id)) {
								target_selected = "selected";
							}
						}

					}
					$('#code-repository').append('<option value="'+value.id+'" '+target_selected+'>'+value.name+'</option>');
				});
				$('#code-repository').selectpicker('refresh');
			}
			else {
				return false;
			}
		}
	});
}


//级联自测
var self_test_dom = $('#self_test');
var jacp_card_dom = $('#jacp_card_id');
var run_id_dom = $('#run_id');
var origin_self_test_val = run_id_dom.val();
//各种选项变化的时候，直接从当前的选择取。（初始化时应该传入）
jacp_card_dom.change(function(){
    var jacp_card_id = jacp_card_dom.val();
    var options = $("#module_id").val();
    var module_white_list = $('#module_'+options).attr('data-value');
    showSelfTestSwitch(jacp_card_id);
    showSelfTest();
    if(module_white_list == 2) {
        $('.self_test_switch').hide();
    }

    $('#apply_type').val(4)
    apply_type_change()
    const d=new Date;d.setTime(d.getTime()+86400e3*30)
    $("#expect_online_date").val([d.getFullYear(),d.getMonth()+1,d.getDate()].map(a=>a<10?'0'+a:a).join('-'))
    $('#version_server').val('0')
    $('#test_content').val('无')
    $('#module_id').val('73').change()
    $('#self_test').val(0)
    $('#modification_explanation').val('无')
    $('#affect_range').val('无')
    $('[name="degrade_switch_apply"][value="0"]+ins').click()
    $('[name="pressure_test"][value="0"]+ins').click()
    $('#interface_name').val('无')
    $('#test_data').val('无')
    $('#test_address').val('http://beta-ace.jd.com/launch/')
    $('#review_result').val(1).change()
    $('#request-memo').val('无')

});
self_test_dom.change(function (){
	showSelfTest();
});



//行云卡片变化时，隐藏或显示“是否需要自测”的选项
function showSelfTestSwitch(jacp_card_id,if_self_test =1){
	if(jacp_card_id == null || jacp_card_id == -1){
        $('#self_test').val(0);
		run_id_dom.val(0);
		$('#self_test_url').html("无");
		$('.self_test_switch').hide();
	}
	else{
        $('#self_test').val(if_self_test);
        $('.self_test_switch').show();
	}
}

//“是否需要则测”改变时，隐藏或显示自测集下拉框和自测url
function showSelfTest(jacp_card_id = 0,if_self_test = -1,origin_run_id = 0) {
    if(jacp_card_id == 0){//没有传入行云卡片时，从当前的获取
        jacp_card_id = jacp_card_dom.val();
    }
    if(if_self_test == -1){//没有传入是否自测时，从当前的获取
        if_self_test = self_test_dom.val();
    }
	if(jacp_card_id == null || jacp_card_id == -1 || if_self_test == 0){
		run_id_dom.val(0);
		$('#self_test_url').html("无");
		$('.self_test_side').hide();
	}
	else{
		$('.self_test_side').show();
        if(origin_run_id == 0){
            origin_run_id = run_id_dom.val();
        }
		get_run_id(jacp_card_id,origin_run_id);
	}
}

//需要自责时，去穹天请求某个行云卡片对应的所有所有自测集，根据当前传入的自测集编号，使某个自测集编号被选中
function get_run_id(jacp_card_id,origin_run_id){
	$.ajax({
		url: '/Integration/Integration/getQttpSelfTestSet/'+jacp_card_id,//url+jacp_card_id,
		type: 'GET',
		cache: false,
		dataType: 'json',
		processData: false,
		contentType: false,
		success:function(data) {
			if(data.code == '0000' && data.hasOwnProperty("records")){//success
				var arr = data.records;
				run_id_dom.find("option").remove();
				run_id_dom.append("<option value='0' selected=''>请选择</option>");
				arr.forEach(function(value,i){
					if(!value.hasOwnProperty("runId") || !value.hasOwnProperty("recordName")){
						return;
					}
					var select_status = "";
					if(origin_run_id == value.runId){
						select_status = "selected";
					}
					run_id_dom.append("<option value='"+value.runId+"' "+select_status+">"+value.recordName+"</option>");

					if(value.hasOwnProperty("recordAddress")){
						self_test_url_map[value.runId] = value.recordAddress;
					}
					else{
						self_test_url_map[value.runId] = '暂无自测url'+value.runId;
					}
				});
			}
			else{
				console.log(data.message);
			}
		},
		error:function(XMLHttpRequest,textStatus, errorThrown){
			console.log(errorThrown);
		}
	});
}


var self_test_url_map = {};
self_test_url_map[0] = "无";
run_id_dom.change(function(){
	$('#self_test_url').html("<a href='"+self_test_url_map[run_id_dom.val()]+"'>"+self_test_url_map[run_id_dom.val()]+"</a>");
});
