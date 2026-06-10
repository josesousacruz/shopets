<?php

namespace App\Http\Controllers\Api\V1\Storefront;

use App\Http\Controllers\Controller;
use App\Http\Resources\V1\BannerResource;
use App\Models\BannerHome;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class BannerController extends Controller
{
    public function index(): AnonymousResourceCollection
    {
        $banners = BannerHome::vigentes()
            ->orderBy('ordem')
            ->orderBy('id_banner')
            ->get();

        return BannerResource::collection($banners);
    }
}
