define(['$', 'toast', 'common/class/urls'], function($, toast, urls) {
    var settings = $.ajaxSettings;
    settings.type = "POST";
    settings.charset = "utf8";
    settings.dataType = "json";
    settings.timeout = 1000 * 20;
    settings.xhrFields = {
        withCredentials: true
    };
    settings.crossDomain = true;

    settings.beforeSend = function() {
        var cancelMask = arguments[1].cancelMask;
        if (!cancelMask) {
            $.util.loading.show();
        }
    };
    settings.complete = function() {
        $.util.loading.hide();
    };

    function request(options) {
        var success = options.success;
        var error = options.error;
        var cookies = $.cookie.get("tokenid");
        var activityId = $.util.getQuery("activityId") || '11';
        var pageId = $.util.getQuery("pageId") || '11';
        var hitRelevance = $.util.getQuery("hitRelevance");
        var src = $.util.getQuery("src");
        var mcAid = $.util.getQuery("mcAid") || '';
        if (cookies) {
            var k = $.extend({}, options.data, {
                tokenid: cookies
            });
        } else {
            if (activityId != "11") { //通天塔
                var k = $.extend({}, options.data, {
                    activityId: activityId,
                    pageId: pageId,
                    callSource: 1,
                    hitRelevance:hitRelevance,
                    src: src,
                    mcAid:mcAid
                });
            } else if (src == "mc") {//提报
                var k = $.extend({}, options.data, {
                    callSource: 1,
                    src: src,
                    mcAid:mcAid
                });
            }else
                var k = $.extend({}, options.data, {
                     callSource  : 1
                });
        }

        settings.timeout = options.timeout?options.timeout:1000*20;

        options.url = urls.get(options.url);
        options.data = "body=" + JSON.stringify(k);
        options.success = function(data, status, xhr) {
            if (data.code == "0") {
                if (data.subCode == "3-02" || data.subCode == "3-03" || data.subCode == "3-04") {
                    toast(data.returnMsg);
                    sessionStorage.setItem("user", data.erpNo);
                    sessionStorage.setItem("returnMsg", data.returnMsg);
                    setTimeout(function() {
                            $.util.goToPage("login/index");
                        }, 100);
                } else if (data.subCode == "3-00") {
                    toast(data.returnMsg);
                    setTimeout(function() {
                            $.util.goToPage("login/index");
                        }, 2000);
                }else if (data.subCode == "1-13") {
                    toast("该商品组或者广告组已被锁定，请先解锁再进行操作");
                }else{
                    success && success(data, status, xhr);
                }
            } else if (data.code == "2") {
                toast('此接口不存在！');
            }  else if (data.code == "3") {
                location.href = "//ssa.jd.com/sso/logout?ReturnUrl=" + encodeURIComponent(location.href);
               // location.href = "http://erp1.jd.com/newHrm/Verify.aspx?ReturnUrl=" + encodeURIComponent(location.href);
            } else {
                //公告的编辑或新增参数校验错误
                if(data.subCode == "99-99"){
                    toast('参数校验错误,标题或内容有未能解析的字符，如 %、&等,请检查！');
                }else{
                    !options.canelToast && toast('网络跑累了，请稍候再来！');
                }
            }
        };
        options.error = error || function() {
            toast('网络飞到外太空去喽！');
            setTimeout(function() {
                $.util.goToPage("login/index");
            }, 2000);
        };

        return $.ajax(options);
    }
    return request;
});
